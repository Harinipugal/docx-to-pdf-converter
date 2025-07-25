document.addEventListener('DOMContentLoaded', () => {
    // --- UI Element References (UPDATED IDs/Classes) ---
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay'); // New element to show file name
    const uploadButton = document.querySelector('.upload-button'); // The custom label for file input
    const convertDocxToPdfBtn = document.getElementById('convertDocxToPdfBtn');
    const convertPdfToDocxBtn = document.getElementById('convertPdfToDocxBtn'); // Still disabled
    const statusMessage = document.getElementById('statusMessage'); // Updated ID
    const downloadLink = document.getElementById('downloadLink');

    // --- UI State Management Functions ---
    function resetUI() {
        if (fileInput) {
            fileInput.value = ''; // Clear selected file
            fileInput.disabled = false; // Ensure file input is enabled
        }
        if (uploadButton) uploadButton.style.pointerEvents = 'auto'; // Make custom label clickable

        if (convertDocxToPdfBtn) convertDocxToPdfBtn.disabled = true;
        if (convertPdfToDocxBtn) convertPdfToDocxBtn.disabled = true; // Still disabled
        
        if (statusMessage) statusMessage.textContent = 'Choose your document and hit convert with ease.'; // Reset status message
        if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen'; // Reset file name display
        
        if (downloadLink) {
            downloadLink.classList.add('hidden'); // Hide download link
            downloadLink.href = '#'; // Reset download link URL
            downloadLink.innerHTML = '<i class="fas fa-download icon-left"></i> Download Converted File'; // Reset text and icon
        }
    }

    function updateUI(file = null) {
        if (convertDocxToPdfBtn) convertDocxToPdfBtn.disabled = true;
        if (convertPdfToDocxBtn) convertPdfToDocxBtn.disabled = true;
        if (downloadLink) downloadLink.classList.add('hidden'); // Hide download link

        if (file) {
            if (fileNameDisplay) fileNameDisplay.textContent = file.name; // Display selected file name
            if (statusMessage) statusMessage.textContent = `Selected: ${file.name}`;
            if (file.name.toLowerCase().endsWith('.docx')) {
                if (convertDocxToPdfBtn) convertDocxToPdfBtn.disabled = false; // Enable DOCX to PDF
            } else {
                if (statusMessage) statusMessage.textContent = 'Please select a .docx file for conversion.';
                // Keep convert button disabled if wrong file type
            }
        } else {
            resetUI(); // If no file selected, reset to initial state
        }
    }

    // --- Event Listeners ---
    // Initial UI setup on page load
    resetUI(); 

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            updateUI(fileInput.files[0]);
        });
    } else {
        console.error("Error: fileInput element not found. Check index.html ID.");
    }

    // --- Conversion Logic (same as previous versions) ---
    async function handleConvert() { // Removed 'type' as it's always docxToPdf
        const file = fileInput.files[0];

        if (!file) {
            if (statusMessage) statusMessage.textContent = "Please select a file first.";
            return;
        }

        // Always assume DOCX to PDF as other button is disabled
        if (!file.name.toLowerCase().endsWith('.docx')) {
            if (statusMessage) statusMessage.textContent = "Only DOCX to PDF conversion is supported.";
            return;
        }

        if (statusMessage) statusMessage.textContent = "Uploading and converting... This may take a moment.";
        // Disable all interactive elements during conversion
        if (convertDocxToPdfBtn) convertDocxToPdfBtn.disabled = true;
        if (convertPdfToDocxBtn) convertPdfToDocxBtn.disabled = true;
        if (downloadLink) downloadLink.classList.add('hidden');
        if (fileInput) fileInput.disabled = true;
        if (uploadButton) uploadButton.style.pointerEvents = 'none'; // Make custom label unclickable

        const formData = new FormData();
        formData.append("file", file);

        try {
            // !!! IMPORTANT: This URL MUST BE REPLACED with your deployed Render backend URL !!!
            // Example: "https://your-nodejs-backend.onrender.com/convert"
            const backendUrl = "https://docx-to-pdf-converter-backend-nre5.onrender.com/convert"; 

            const response = await fetch(backendUrl, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob(); 
                const url = window.URL.createObjectURL(blob); 
                
                const originalFileName = file.name.split('.').slice(0, -1).join('.');
                const downloadFileName = `${originalFileName}.pdf`; 

                if (downloadLink) {
                    downloadLink.href = url;
                    downloadLink.download = downloadFileName;
                    downloadLink.innerHTML = `<i class="fas fa-download icon-left"></i> Download ${downloadFileName}`;
                    downloadLink.classList.remove('hidden'); // Show download link
                    
                    const tempAnchor = document.createElement('a');
                    tempAnchor.href = url;
                    tempAnchor.download = downloadFileName;
                    document.body.appendChild(tempAnchor);
                    tempAnchor.click();
                    document.body.removeChild(tempAnchor);
                }
                if (statusMessage) statusMessage.textContent = "Conversion successful! Your file is downloading.";

                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    resetUI(); // Reset UI after download
                }, 3000); // 3-second delay

            } else {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    if (statusMessage) statusMessage.textContent = `Conversion failed! ${errorData.error || 'Unknown error.'}`;
                    console.error("Server error (JSON):", errorData);
                } catch (e) {
                    if (statusMessage) statusMessage.textContent = `Conversion failed! ${errorText || 'Unknown error.'}`;
                    console.error("Server error (raw text):", errorText);
                }
                // Re-enable file input and custom label on error
                if (fileInput) fileInput.disabled = false;
                if (uploadButton) uploadButton.style.pointerEvents = 'auto';
                updateUI(fileInput.files[0]); // Re-evaluate button states
            }
        } catch (err) {
            if (statusMessage) statusMessage.textContent = "Conversion failed due to a network error or server issue!";
            console.error("Fetch error:", err);
            // Re-enable file input and custom label on error
            if (fileInput) fileInput.disabled = false;
            if (uploadButton) uploadButton.style.pointerEvents = 'auto';
            updateUI(fileInput.files[0]); // Re-evaluate button states
        }
    }

    // Attach click event listeners to the conversion button
    if (convertDocxToPdfBtn) {
        convertDocxToPdfBtn.addEventListener('click', handleConvert); // No 'type' argument needed
    }
    // The PDF to DOCX button is permanently disabled in HTML, so no active listener needed
});
