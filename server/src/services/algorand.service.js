import algosdk from "algosdk";

const generateFallbackTxId = () => {
  return (
    process.env.DEMO_FALLBACK_TXID ||
    "DEMO_TX_" + Math.random().toString(36).substring(7).toUpperCase()
  );
};

const getAlgodClient = () =>
  new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", 443);

async function mintVersionProof({
  entityType,
  entityId,
  versionNumber,
  action,
  actor,
  referenceUrl = "",
  payload = {},
}) {
  try {
    if (!process.env.ALGORAND_ADMIN_MNEMONIC) {
      console.warn("ALGORAND_ADMIN_MNEMONIC not set, using demo fallback TXID");
      return generateFallbackTxId();
    }

    const algodClient = getAlgodClient();
    const account = algosdk.mnemonicToSecretKey(
      process.env.ALGORAND_ADMIN_MNEMONIC,
    );
    const suggestedParams = await algodClient.getTransactionParams().do();

    const notePayload = JSON.stringify({
      app: "TraceHub",
      event: "VERSION_SNAPSHOT",
      entityType,
      entityId,
      versionNumber,
      action,
      actor,
      referenceUrl,
      payload,
      timestamp: new Date().toISOString(),
    });

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      receiver: account.addr,
      amount: 0,
      note: new TextEncoder().encode(notePayload),
      suggestedParams,
    });

    const signedTxn = algosdk.signTransaction(txn, account.sk);
    const { txid } = await algodClient.sendRawTransaction(signedTxn.blob).do();

    await algosdk.waitForConfirmation(algodClient, txid, 4);
    return txid;
  } catch (error) {
    console.error("Algorand version mint error:", error.message);
    return generateFallbackTxId();
  }
}

async function mintProofOfPublication(dualityUrl, uploaderName) {
  return mintVersionProof({
    entityType: "RESOURCE",
    entityId: "publication",
    versionNumber: 1,
    action: "CREATE",
    actor: uploaderName,
    referenceUrl: dualityUrl || "",
    payload: {
      dualityUrl: dualityUrl || "",
    },
  });
}

export { mintProofOfPublication, mintVersionProof };
