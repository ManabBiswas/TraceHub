import express from "express";
import algosdk from "algosdk";
import Resource from "../models/Resource.js";
import { hashResource } from "../utils/contentHash.js";

const router = express.Router();

/**
 * GET /api/verify/:txid
 * 
 * The source of truth for blockchain verification.
 * Reads the Algorand transaction directly from the testnet node,
 * decodes the note field, recomputes the content hash from MongoDB,
 * and compares them.
 * 
 * Three possible outcomes:
 * 
 * VALID   — blockchain TX exists, content hash matches MongoDB → not tampered
 * TAMPERED — blockchain TX exists, content hash DOES NOT match → MongoDB was modified
 * NOT_FOUND — no such TX on Algorand → TXID is fake
 * DEMO — demo/fallback transaction ID (not on blockchain)
 */
router.get("/:txid", async (req, res) => {
    const { txid } = req.params;

    // Reject obvious demo/fake TXIDs immediately
    if (!txid || txid.startsWith("DEMO_") || txid.length < 50) {
        return res.json({
            result: "DEMO",
            message: "This is a demo transaction ID. Not recorded on blockchain.",
            txid,
        });
    }

    try {
        // Step 1: Fetch the actual transaction from Algorand testnet
        const algodToken = process.env.ALGOD_TOKEN ?? "";
        const algodServer = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
        const algodPort = Number(process.env.ALGOD_PORT ?? 443);
        const algod = new algosdk.Algodv2(algodToken, algodServer, algodPort);

        let txInfo;
        try {
            txInfo = await algod.pendingTransactionInformation(txid).do();

            // If not in pending pool, search confirmed transactions
            if (!txInfo || !txInfo.txn) {
                // Use the indexer for confirmed transactions
                // Algonode provides a free indexer at testnet-idx.algonode.cloud
                const indexerToken = "";
                const indexerServer = "https://testnet-idx.algonode.cloud";
                const indexer = new algosdk.Indexer(indexerToken, indexerServer, 443);
                const indexerResult = await indexer.lookupTransactionByID(txid).do();
                txInfo = indexerResult.transaction;
            }
        } catch (e) {
            return res.json({
                result: "NOT_FOUND",
                message: "Transaction not found on Algorand testnet. This TXID may be fabricated.",
                txid,
            });
        }

        // Step 2: Decode the note field
        let noteData;
        try {
            const noteBytes = txInfo.note ?? txInfo.txn?.txn?.note;
            if (!noteBytes) {
                return res.json({
                    result: "INVALID",
                    message: "Transaction exists but has no note field. Not a TraceHub transaction.",
                    txid,
                });
            }

            // note is base64 encoded
            const noteString = Buffer.from(noteBytes, "base64").toString("utf8");
            noteData = JSON.parse(noteString);
        } catch (e) {
            return res.json({
                result: "INVALID",
                message: "Transaction note could not be decoded.",
                txid,
            });
        }

        // Step 3: Confirm it is a TraceHub transaction
        if (noteData.app !== "TraceHub") {
            return res.json({
                result: "INVALID",
                message: "This is a valid Algorand transaction but not from TraceHub.",
                txid,
                onChainData: noteData,
            });
        }

        // Step 4: If the note contains a contentHash, verify against current MongoDB state
        if (noteData.contentHash && noteData.entityId) {
            const resource = await Resource.findById(noteData.entityId);

            if (!resource) {
                // Resource was deleted from MongoDB but blockchain record survives
                return res.json({
                    result: "DELETED",
                    message: "Blockchain proof exists but the resource was deleted from the database.",
                    txid,
                    onChainData: {
                        entityType: noteData.entityType,
                        action: noteData.action,
                        actor: noteData.actor,
                        timestamp: noteData.timestamp,
                        contentHash: noteData.contentHash,
                    },
                });
            }

            // Recompute the hash from current MongoDB state
            const currentHash = hashResource(resource);

            if (currentHash !== noteData.contentHash) {
                // THE DATABASE WAS TAMPERED WITH
                return res.json({
                    result: "TAMPERED",
                    message: "INTEGRITY VIOLATION: The blockchain proof does not match the current database state. This record was modified after blockchain verification.",
                    txid,
                    onChainData: {
                        entityType: noteData.entityType,
                        action: noteData.action,
                        actor: noteData.actor,
                        timestamp: noteData.timestamp,
                        recordedHash: noteData.contentHash,
                    },
                    currentHash,
                    tamperEvidence: {
                        recordedHash: noteData.contentHash,
                        currentHash,
                        hashesMatch: false,
                    },
                });
            }

            // Hashes match — content is authentic
            return res.json({
                result: "VALID",
                message: "Verification successful. Content matches blockchain record. No tampering detected.",
                txid,
                explorerUrl: `https://testnet.algoexplorer.io/tx/${txid}`,
                onChainData: {
                    entityType: noteData.entityType,
                    action: noteData.action,
                    actor: noteData.actor,
                    timestamp: noteData.timestamp,
                    contentHash: noteData.contentHash,
                },
                tamperEvidence: {
                    recordedHash: noteData.contentHash,
                    currentHash,
                    hashesMatch: true,
                },
            });
        }

        // Transaction exists and is from TraceHub but predates the hash system
        return res.json({
            result: "VALID_NO_HASH",
            message: "Blockchain transaction verified. This record predates content hashing.",
            txid,
            explorerUrl: `https://testnet.algoexplorer.io/tx/${txid}`,
            onChainData: noteData,
        });

    } catch (error) {
        console.error("Verification error:", error.message);
        return res.status(500).json({
            result: "ERROR",
            message: "Verification service error. Try again.",
            error: error.message,
        });
    }
});

export default router;
