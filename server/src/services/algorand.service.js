import algosdk from "algosdk";

async function mintProofOfPublication(dualityUrl, uploaderName) {
  try {
    if (!process.env.ALGORAND_ADMIN_MNEMONIC) {
      console.warn(
        "ALGORAND_ADMIN_MNEMONIC not set, using demo fallback TXID"
      );
      return (
        process.env.DEMO_FALLBACK_TXID ||
        "DEMO_TX_" + Math.random().toString(36).substring(7).toUpperCase()
      );
    }

    const algodClient = new algosdk.Algodv2(
      "",
      "https://testnet-api.algonode.cloud",
      443
    );

    const mnemonic = process.env.ALGORAND_ADMIN_MNEMONIC;
    const account = algosdk.mnemonicToSecretKey(mnemonic);

    const suggestedParams = await algodClient.getTransactionParams().do();

    const notePayload = JSON.stringify({
      app: "TraceHub",
      dualityUrl,
      uploader: uploaderName,
      timestamp: new Date().toISOString()
    });

    // algosdk v3 uses 'sender' and 'receiver' instead of 'from' and 'to'
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: account.addr,      // v3: renamed from 'from'
      receiver: account.addr,    // v3: renamed from 'to'
      amount: 0,
      note: new TextEncoder().encode(notePayload),
      suggestedParams
    });

    // algosdk v3: use algosdk.signTransaction instead of txn.signTxn
    const signedTxn = algosdk.signTransaction(txn, account.sk);
    const { txid } = await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txid, 4);

    return txid;  // v3: lowercase 'txid', not 'txId'
  } catch (error) {
    console.error("Algorand mint error:", error.message);
    return (
      process.env.DEMO_FALLBACK_TXID ||
      "DEMO_TX_" + Math.random().toString(36).substring(7).toUpperCase()
    );
  }
}

export { mintProofOfPublication };
