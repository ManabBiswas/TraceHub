/**
 * algorand.service.js — Hardened Algorand notary for TraceHub
 *
 * Replaces the original algorand.service.js with:
 *  • Automatic retry with exponential back-off (network blips don't fail uploads)
 *  • Connection pre-flight check (fails fast if the node is unreachable)
 *  • TXID verification after submission (confirms the TX is actually on-chain)
 *  • Structured note payload that judges / recruiters can decode on the explorer
 *  • Dual-mode signing: mnemonic (default) or KMD (local node)
 *  • Demo-fallback mode controlled by ALGORAND_DEMO_FALLBACK=true
 *
 * No breaking changes — all exported function signatures are identical
 * to the original so zero changes are needed in any route or controller.
 */

import algosdk from "algosdk";

// ── Config helpers ─────────────────────────────────────────────────────────────

const isDemoFallback = () =>
  String(process.env.ALGORAND_DEMO_FALLBACK ?? "false").toLowerCase() ===
  "true";

const makeFallbackTxId = (label = "") =>
  `DEMO_${label.toUpperCase().replace(/\s+/g, "_")}_${Date.now().toString(36).toUpperCase()}`;

const getAlgodClient = () => {
  const token = process.env.ALGOD_TOKEN ?? "";
  const server =
    process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
  const port = Number(process.env.ALGOD_PORT ?? 443);
  return new algosdk.Algodv2(token, server, port);
};

// ── Retry helper ───────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1200;

async function withRetry(label, fn) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `⚠️  Algorand [${label}] attempt ${attempt}/${MAX_RETRIES} failed — retrying in ${delay}ms`,
        );
        console.warn(`    Reason: ${err.message}`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── Pre-flight connectivity check ─────────────────────────────────────────────

let _nodeReachable = null; // cached per process lifetime

async function checkAlgorandNode() {
  if (_nodeReachable !== null) return _nodeReachable;
  try {
    const client = getAlgodClient();
    await client.status().do();
    _nodeReachable = true;
    console.log("✅  Algorand node reachable");
  } catch {
    _nodeReachable = false;
    console.warn(
      "⚠️  Algorand node unreachable — minting will use demo fallback if enabled",
    );
  }
  return _nodeReachable;
}

// ── Account resolution ─────────────────────────────────────────────────────────

function getAccountFromMnemonic() {
  const mnemonic = process.env.ALGORAND_ADMIN_MNEMONIC;
  if (!mnemonic) throw new Error("ALGORAND_ADMIN_MNEMONIC not set in .env");
  return algosdk.mnemonicToSecretKey(mnemonic.trim());
}

const hasKmdConfig = () =>
  Boolean(
    process.env.KMD_SERVER &&
    process.env.KMD_PORT &&
    process.env.KMD_TOKEN &&
    process.env.KMD_WALLET_NAME,
  );

async function getAccountFromKmd() {
  if (!hasKmdConfig()) {
    throw new Error(
      "KMD config missing. Set KMD_SERVER, KMD_PORT, KMD_TOKEN, and KMD_WALLET_NAME",
    );
  }

  const kmd = new algosdk.Kmd(
    process.env.KMD_TOKEN,
    process.env.KMD_SERVER,
    Number(process.env.KMD_PORT),
  );

  const walletPassword = process.env.KMD_WALLET_PASSWORD ?? "";
  const walletsRes = await kmd.listWallets();
  const wallets = walletsRes?.wallets ?? [];
  const wallet = wallets.find((w) => w.name === process.env.KMD_WALLET_NAME);

  if (!wallet?.id) {
    throw new Error(`KMD wallet not found: ${process.env.KMD_WALLET_NAME}`);
  }

  const handleRes = await kmd.initWalletHandle(wallet.id, walletPassword);
  const handle = handleRes?.wallet_handle_token;
  if (!handle) {
    throw new Error("Unable to initialize KMD wallet handle");
  }

  try {
    const keysRes = await kmd.listKeys(handle);
    const addresses = keysRes?.addresses ?? [];
    const requestedAddress = process.env.KMD_ACCOUNT_ADDRESS;
    const selectedAddress = requestedAddress || addresses[0];

    if (!selectedAddress) {
      throw new Error("No account found in KMD wallet");
    }

    if (requestedAddress && !addresses.includes(requestedAddress)) {
      throw new Error(
        `KMD_ACCOUNT_ADDRESS not found in wallet '${process.env.KMD_WALLET_NAME}': ${requestedAddress}`,
      );
    }

    const keyRes = await kmd.exportKey(handle, walletPassword, selectedAddress);
    const privateKey = keyRes?.private_key;

    if (!privateKey) {
      throw new Error("KMD returned empty private key");
    }

    return {
      addr: selectedAddress,
      sk: privateKey,
    };
  } finally {
    try {
      await kmd.releaseWalletHandle(handle);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

async function resolveSigningAccount() {
  const mode = String(
    process.env.ALGORAND_SIGNER_MODE ?? "mnemonic",
  ).toLowerCase();
  if (mode === "kmd") return getAccountFromKmd();
  if (mode === "mnemonic") return getAccountFromMnemonic();
  throw new Error(
    `Unsupported ALGORAND_SIGNER_MODE: ${mode}. Use 'mnemonic' or 'kmd'.`,
  );
}

// ── Note builder ───────────────────────────────────────────────────────────────

/**
 * Build the structured note that gets written to the Algorand blockchain.
 * Judges can see this in the testnet explorer by clicking the transaction
 * and decoding the note field (base64 → UTF-8).
 * 
 * Now includes contentHash for tamper detection: if the content in MongoDB
 * changes after this transaction is minted, recomputing the hash will produce
 * a different result, proving tampering occurred.
 */
function buildNote({
  entityType,
  entityId,
  versionNumber,
  action,
  actor,
  referenceUrl,
  payload,
  contentHash,
}) {
  const note = {
    app: "TraceHub",
    version: "2.0",
    event: "VERSION_SNAPSHOT",
    entityType,
    entityId,
    versionNumber,
    action,
    actor,
    referenceUrl: referenceUrl ?? "",
    payload: payload ?? {},

    // SHA-256 of the actual content at the moment of signing.
    // Tamper with MongoDB → hash recomputation → mismatch → INVALID
    contentHash: contentHash ?? "",

    timestamp: new Date().toISOString(),
  };
  return new TextEncoder().encode(JSON.stringify(note));
}

// ── Core mint function ─────────────────────────────────────────────────────────

/**
 * Submit a 0-ALGO self-payment with a structured note to Algorand testnet.
 * Returns the confirmed transaction ID (TXID).
 *
 * Internally retries up to MAX_RETRIES times before throwing.
 */
async function _mintOnChain({
  entityType,
  entityId,
  versionNumber,
  action,
  actor,
  referenceUrl,
  payload,
  contentHash,
}) {
  return withRetry("mint", async () => {
    const algod = getAlgodClient();
    const account = await resolveSigningAccount();
    const params = await algod.getTransactionParams().do();

    const noteBytes = buildNote({
      entityType,
      entityId,
      versionNumber,
      action,
      actor,
      referenceUrl,
      payload,
      contentHash,
    });

    // Algorand note field max = 1024 bytes — truncate payload gracefully
    const maxNoteBytes = 1000;
    const safeNote =
      noteBytes.length <= maxNoteBytes
        ? noteBytes
        : new TextEncoder().encode(
          JSON.stringify({
            app: "TraceHub",
            entityType,
            entityId,
            action,
            actor,
            timestamp: new Date().toISOString(),
            truncated: true,
          }),
        );

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      receiver: account.addr,
      amount: 0,
      note: safeNote,
      suggestedParams: params,
    });

    const signedTxn = algosdk.signTransaction(txn, account.sk);
    const { txid } = await algod.sendRawTransaction(signedTxn.blob).do();

    // ── Wait for confirmation ──────────────────────────────────────────────
    const confirmed = await algosdk.waitForConfirmation(algod, txid, 6);
    const round =
      confirmed["confirmed-round"] ?? confirmed.confirmedRound ?? "?";

    console.log(
      `✅  Algorand TX confirmed | TXID: ${txid} | Round: ${round} | Action: ${action}`,
    );
    return txid;
  });
}

// ── Public API (same signatures as original) ───────────────────────────────────

/**
 * Mint a version snapshot proof on the Algorand blockchain.
 *
 * @param {object} opts
 * @param {string} opts.entityType    - "RESOURCE" | "CLASS_POST" | "SUBMISSION"
 * @param {string} opts.entityId      - MongoDB document _id (stringified)
 * @param {number} opts.versionNumber
 * @param {string} opts.action        - "CREATE" | "UPDATE" | "APPROVE" | "GRADE"
 * @param {string} opts.actor         - User name or role
 * @param {string} [opts.referenceUrl]- IPFS / storage URL
 * @param {object} [opts.payload]     - Extra metadata to encode in the note
 * @param {string} [opts.contentHash] - SHA-256 hash of content for tamper detection
 * @returns {Promise<string>}         - Algorand TXID or demo fallback string
 */
async function mintVersionProof(opts) {
  // ── Demo mode shortcut ────────────────────────────────────────────────────
  if (isDemoFallback()) {
    const id = makeFallbackTxId(opts.action);
    console.log(`ℹ️   Algorand demo fallback — TX: ${id}`);
    return id;
  }

  // ── Pre-flight ────────────────────────────────────────────────────────────
  const reachable = await checkAlgorandNode();
  if (!reachable) {
    if (isDemoFallback()) {
      const id = makeFallbackTxId(opts.action);
      console.warn(`⚠️   Algorand node unreachable — demo TX: ${id}`);
      return id;
    }
    throw new Error(
      "Algorand node unreachable and ALGORAND_DEMO_FALLBACK is false",
    );
  }

  // ── Real mint ─────────────────────────────────────────────────────────────
  try {
    return await _mintOnChain(opts);
  } catch (err) {
    console.error("❌  Algorand mint failed after retries:", err.message);
    if (isDemoFallback()) {
      const id =
        process.env.DEMO_FALLBACK_TXID ?? makeFallbackTxId(opts.action);
      console.warn(`⚠️   Using fallback TX: ${id}`);
      return id;
    }
    throw err;
  }
}

/**
 * Convenience wrapper for the "Proof of Publication" on initial file upload.
 * (Kept for backward-compat with upload.js route.)
 */
async function mintProofOfPublication(ipfsUrl, uploaderName) {
  return mintVersionProof({
    entityType: "RESOURCE",
    entityId: "publication",
    versionNumber: 1,
    action: "CREATE",
    actor: uploaderName,
    referenceUrl: ipfsUrl ?? "",
    payload: { ipfsUrl: ipfsUrl ?? "" },
  });
}

// ── Utility: verify a TXID is actually on-chain ────────────────────────────────

/**
 * Given a TXID string, return the confirmed-round if it exists on-chain,
 * or null if it's a demo/fallback ID or the lookup fails.
 *
 * Use this in a future /api/verify/:txid endpoint to let judges confirm
 * authenticity during the demo.
 */
async function verifyTxOnChain(txid) {
  if (!txid || txid.startsWith("DEMO_")) return null;
  try {
    const algod = getAlgodClient();
    const result = await algod.pendingTransactionInformation(txid).do();
    return result["confirmed-round"] ?? result.confirmedRound ?? null;
  } catch {
    return null;
  }
}

/**
 * Health-check helper — returns true if the Algorand node responds.
 * Used by the /health endpoint in server.js.
 */
async function isAlgorandHealthy() {
  try {
    await getAlgodClient().status().do();
    return true;
  } catch {
    return false;
  }
}

export {
  mintVersionProof,
  mintProofOfPublication,
  verifyTxOnChain,
  isAlgorandHealthy,
  checkAlgorandNode,
};
