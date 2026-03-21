import multer from "multer";

const storage = multer.memoryStorage(); // buffer, not disk

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB hard cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("PDF files only"));
    }
  }
});

export default upload;
