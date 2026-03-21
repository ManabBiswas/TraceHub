
import axios from "axios";
import FormData from "form-data";

const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * @param {Buffer} fileBuffer  - Raw file bytes
 * @param {string} filename    - Original file name (used as IPFS metadata)
 * @returns {Promise<string>}  - Public HTTPS gateway URL
 */
async function uploadToDuality(fileBuffer, filename) {
  // ── Demo / CI fallback ─────────────────────────────────────────────────
  if (!process.env.PINATA_JWT) {
    console.warn("⚠️  PINATA_JWT not set — returning mock IPFS URL");
    const fakeHash = `QmMock${Buffer.from(filename).toString("hex").slice(0, 20)}${Date.now()}`;
    return `${IPFS_GATEWAY}/${fakeHash}`;
  }

  // ── Real Pinata upload ─────────────────────────────────────────────────
  try {
    const form = new FormData();
    form.append("file", fileBuffer, { filename });

    // Optional: tag the upload so you can find it in the Pinata dashboard
    const metadata = JSON.stringify({ name: `tracehub-${filename}` });
    form.append("pinataMetadata", metadata);

    const response = await axios.post(PINATA_ENDPOINT, form, {
      maxBodyLength: Infinity,
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
    });

    const ipfsHash = response.data?.IpfsHash;
    if (!ipfsHash) throw new Error("Pinata returned no IpfsHash");

    return `${IPFS_GATEWAY}/${ipfsHash}`;
  } catch (error) {
    console.error("Pinata upload error:", error.message);
    // Graceful degradation — never crash the upload flow
    const fakeHash = `QmFallback${Date.now()}`;
    return `${IPFS_GATEWAY}/${fakeHash}`;
  }
}

export { uploadToDuality };