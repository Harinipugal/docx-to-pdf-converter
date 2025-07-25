// server.js
const express = require('express');
const multer = require('multer'); // For handling file uploads
const cloudinary = require('cloudinary').v2; // Cloudinary SDK
const libre = require('libreoffice-convert'); // LibreOffice conversion library
const util = require('util'); // For promisifying libre.convert
const fs = require('fs'); // File system operations
const path = require('path'); // Path manipulation
const cors = require('cors'); // For handling Cross-Origin Resource Sharing

// --- Load environment variables from .env file (for local development) ---
require('dotenv').config(); 

// Promisify libre.convert for async/await usage
libre.convert = util.promisify(libre.convert);

const app = express();
app.use(cors()); // Enable CORS for all routes, allowing frontend to communicate

// --- Configuration ---
// IMPORTANT: Cloudinary API credentials will be read from Render's Environment Variables.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "di66a4dl3", // Your Cloudinary Cloud Name
    api_key: process.env.CLOUDINARY_API_KEY || "743366992757372", // Your Cloudinary API Key
    api_secret: process.env.CLOUDINARY_API_SECRET // Read from environment variable
});

// Define temporary folders for uploads and converted files
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CONVERTED_DIR = path.join(__dirname, 'converted');

// Ensure temporary directories exist (synchronously, as needed on startup)
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(CONVERTED_DIR, { recursive: true });

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Create a unique filename to avoid conflicts, preserving original extension
        cb(null, `${Date.now()}-${file.originalname}`); 
    }
});
const upload = multer({ storage: storage });

// --- CRITICAL FIX: Initialize libreoffice-convert with soffice path for LOCAL TESTING ---
// This line is primarily for local Windows development. On Linux/Docker, LibreOffice
// is expected to be in the system's PATH, or a symlink is created by the installation.
libre.convert.path = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'; 

// --- Health Check Endpoint ---
// A simple GET endpoint to check if the server is running
app.get('/health', async (req, res) => {
    console.log('Health check endpoint hit!');
    try {
        // In a real scenario, you might try a dummy conversion here to check LibreOffice
        res.status(200).json({ status: 'ok', message: 'Node.js backend is running.' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ status: 'error', message: 'Health check failed due to internal error.' });
    }
});

// --- Conversion Endpoint ---
// Handles POST requests with a single file upload
app.post('/convert', upload.single('file'), async (req, res) => {
    console.log('Convert endpoint hit!');

    // 1. Check if a file was uploaded
    if (!req.file) {
        console.log('Error: No file provided.');
        return res.status(400).json({ error: 'No file provided' });
    }

    const inputFilePath = req.file.path; // Path where Multer saved the uploaded file
    const originalFileName = path.parse(req.file.originalname).name; // Get filename without extension
    const outputFileName = `${originalFileName}.pdf`; // Desired output PDF filename
    const outputFilePath = path.join(CONVERTED_DIR, outputFileName); // Full path for the output PDF

    try {
        console.log(`File saved locally: ${inputFilePath}`);

        // 2. Convert DOCX to PDF using libreoffice-convert
        console.log(`Converting ${inputFilePath} to PDF locally...`);
        const docxBuf = fs.readFileSync(inputFilePath); // Read the uploaded DOCX file into a buffer

        // Perform the conversion. The third argument 'undefined' uses default conversion filters.
        let pdfBuf = await libre.convert(docxBuf, '.pdf', undefined); 
        
        // Write the resulting PDF buffer to a temporary file
        fs.writeFileSync(outputFilePath, pdfBuf);
        console.log(`Conversion successful. PDF saved at: ${outputFilePath}`);

        // 3. Upload the converted PDF to Cloudinary
        console.log(`Uploading ${outputFileName} to Cloudinary...`);
        const cloudinaryResult = await cloudinary.uploader.upload(outputFilePath, {
            resource_type: 'raw', // Use 'raw' for non-image files like PDFs
            folder: 'converted_docs', // Store in a specific folder in your Cloudinary account
            public_id: originalFileName // Use the original filename as the public ID in Cloudinary
        });
        console.log(`Uploaded to Cloudinary (for storage) with public_id: ${cloudinaryResult.public_id}.pdf`);

        // 4. Send the converted PDF file directly to the user for download
        console.log(`Sending ${outputFileName} to the user for download.`);
        // res.download sends the file and handles setting appropriate headers
        res.download(outputFilePath, outputFileName, (err) => {
            if (err) {
                console.error('Error sending file to user:', err);
                // If an error occurs during file transfer, and headers haven't been sent, send a JSON error
                if (!res.headersSent) { 
                    return res.status(500).json({ error: 'Failed to send file for download.' });
                }
            }
            // 5. Clean up temporary files after the download is initiated
            cleanupFiles(inputFilePath, outputFilePath);
        });

    } catch (error) {
        console.error('An unexpected error occurred during conversion:', error);
        // Ensure cleanup happens even if an error occurs during conversion or upload
        cleanupFiles(inputFilePath, outputFilePath);
        // Send a JSON error response to the frontend
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Conversion failed due to a server error.',
                details: error.message || 'Unknown error' // Provide error message details
            });
        }
    }
});

// --- File Cleanup Function ---
// Deletes the temporary input and output files from the server's disk
function cleanupFiles(inputPath, outputPath) {
    if (fs.existsSync(inputPath)) {
        fs.unlink(inputPath, (err) => {
            if (err) console.error(`Error deleting input file ${inputPath}:`, err);
            else console.log(`Deleted temporary input file: ${inputPath}`);
        });
    }
    if (fs.existsSync(outputPath)) {
        fs.unlink(outputPath, (err) => {
            if (err) console.error(`Error deleting output file ${outputPath}:`, err);
            else console.log(`Deleted temporary output file: ${outputPath}`);
        });
    }
}

// Start the server
// Render provides the PORT environment variable; default to 5000 for local testing
const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => {
    console.log(`Node.js server listening on port ${PORT}`);
});