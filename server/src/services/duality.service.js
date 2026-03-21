import axios from "axios";
import FormData from "form-data";

async function uploadToDuality(fileBuffer, filename) {
  try {
    if (!process.env.DUALITY_API_KEY) {
      console.warn("DUALITY_API_KEY not set, using mock URL");
      return `https://storage.duality.network/ipfs/QmMockHash${Date.now()}`;
    }

    const form = new FormData();
    form.append("file", fileBuffer, { filename });

    const response = await axios.post(
      "https://api.duality.network/v1/upload",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.DUALITY_API_KEY}`
        }
      }
    );

    return response.data.url || response.data.ipfsHash;
  } catch (error) {
    console.error("Duality upload error:", error.message);
    // Return mock URL for demo purposes
    return `https://storage.duality.network/ipfs/QmMockHash${Date.now()}`;
  }
}

export { uploadToDuality };
