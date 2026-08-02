const originalPreview = document.getElementById("originalPreview");
const resizedPreview = document.getElementById("resizedPreview");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

// ========== HIGH QUALITY SETTINGS ==========
const QUALITY_SETTINGS = {
    MIN_QUALITY: 0.1,      // Minimum compression threshold
    START_QUALITY: 0.95,   // Starting quality for compression loop
    STEP: 0.05             // Quality reduction increment
};

function setProgress(percent, text) {
    progressFill.style.width = percent + "%";
    progressText.textContent = text;
}

// ========== FILE INPUT HANDLER (FIXED USER ACTIVATION) ==========
document.getElementById("img").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    setProgress(5, "Image selected");
    
    const reader = new FileReader();
    reader.onload = () => {
        originalPreview.src = reader.result;
        resizedPreview.src = "";
    };
    reader.readAsDataURL(file);
});

// ========== IMAGE UPLOAD BUTTON (ENSURES USER ACTIVATION) ==========
function triggerUpload() {
    // This MUST be called by a button click event
    document.getElementById("img").click();
}

// ========== ASPECT RATIO HANDLING ==========
function getAspectRatio(mode, customW = 1, customH = 1) {
    switch(mode) {
        case 'square': return 1;              // 1:1
        case 'landscape_16_9': return 16/9;   // 16:9
        case 'photo_4_3': return 4/3;         // 4:3
        case 'portrait_9_16': return 9/16;    // 9:16
        case 'custom': return customW / customH;
        case 'free': 
        default: return null;                 // No constraint
    }
}

// ========== MAIN RESIZE FUNCTION ==========
function resizeImage() {
    const fileInput = document.getElementById("img");
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Please select an image first!");
        return;
    }

    setProgress(10, "Loading image…");

    // Get user settings from UI
    const sizeValue = parseFloat(document.getElementById("sizeValue")?.value || 0);
    const sizeUnit = document.getElementById("sizeUnit")?.value || "kb";
    const targetWidth = parseInt(document.getElementById("width")?.value || 0);
    const targetHeight = parseInt(document.getElementById("height")?.value || 0);
    
    // NEW: Aspect ratio mode
    const ratioMode = document.getElementById("aspectRatio")?.value || 'free';
    const customRatioW = parseInt(document.getElementById("customRatioW")?.value || 16);
    const customRatioH = parseInt(document.getElementById("customRatioH")?.value || 9);
    
    // NEW: Output quality preference (from slider if exists)
    const qualitySlider = document.getElementById("qualitySlider");
    const baseQuality = qualitySlider ? parseFloat(qualitySlider.value) : 0.85;
    
    // NEW: Output format
    const outputFormat = document.getElementById("outputFormat")?.value || "image/jpeg";

    setProgress(30, "Processing…");

    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = e => {
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);

    img.onload = () => {
        setProgress(40, "Resizing image…");
        
        let width = img.width;
        let height = img.height;
        
        // Calculate dimensions with aspect ratio consideration
        const aspectRatio = getAspectRatio(ratioMode, customRatioW, customRatioH);
        
        if (targetWidth) {
            if (aspectRatio !== null) {
                // Respect target aspect ratio
                height = Math.round(targetWidth / aspectRatio);
                width = targetWidth;
            } else {
                // Free form - just match width, adjust height proportionally
                height = Math.round(img.height * (targetWidth / img.width));
                width = targetWidth;
            }
        }
        
        if (targetHeight) {
            if (aspectRatio !== null) {
                // Respect target aspect ratio
                width = Math.round(targetHeight * aspectRatio);
                height = targetHeight;
            } else {
                // Free form
                width = Math.round(img.width * (targetHeight / img.height));
                height = targetHeight;
            }
        }
        
        // ========== HIGH QUALITY CANVAS RENDERING ==========
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { alpha: false });
        
        canvas.width = width;
        canvas.height = height;
        
        // ✅ CRITICAL: Enable high-quality resampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // Draw with smooth interpolation
        ctx.drawImage(img, 0, 0, width, height);
        
        setProgress(60, "Optimizing size…");
        
        // Calculate target file size in bytes
        let targetBytes = null;
        if (sizeValue > 0) {
            targetBytes = sizeUnit === "mb" ? sizeValue * 1024 * 1024 : sizeValue * 1024;
        }
        
        // ========== COMPRESSION WITH QUALITY PRESERVATION ==========
        function compress(attemptedQuality = baseQuality) {
            canvas.toBlob(blob => {
                if (!blob) {
                    setProgress(0, "Error creating image");
                    return;
                }
                
                // If targeting specific size and still too large
                if (targetBytes && blob.size > targetBytes && attemptedQuality > QUALITY_SETTINGS.MIN_QUALITY) {
                    // Reduce quality and retry
                    compress(attemptedQuality - QUALITY_SETTINGS.STEP);
                    return;
                }
                
                // Success - display result
                setProgress(100, "Done!");
                
                const reader = new FileReader();
                reader.onload = e => {
                    resizedPreview.src = e.target.result;
                    
                    // Show file info
                    const fileSizeKB = (blob.size / 1024).toFixed(1);
                    const originalSizeKB = (file.size / 1024).toFixed(1);
                    document.getElementById("resultInfo")!.innerHTML = `
                        <div class="info-card">
                            <strong>Original:</strong> ${originalSizeKB} KB<br>
                            <strong>Resized:</strong> ${fileSizeKB} KB<br>
                            <strong>Dimensions:</strong> ${width}×${height}px<br>
                            <strong>Compression:</strong> ${(((1 - blob.size/file.size) * 100).toFixed(1))}%
                        </div>
                    `;
                };
                reader.readAsDataURL(blob);
                
                // Create download button
                const ext = outputFormat.includes('webp') ? 'webp' 
                         : outputFormat.includes('png') ? 'png' : 'jpg';
                const downloadBtn = document.getElementById("downloadBtn");
                if (downloadBtn) {
                    downloadBtn.href = e.target.result;
                    downloadBtn.download = `resized-image-${width}x${height}.${ext}`;
                    downloadBtn.style.display = "inline-block";
                }
                
            }, outputFormat, attemptedQuality);
        }
        
        // Start compression with user's quality preference
        compress(baseQuality);
    };
    
    img.onerror = () => {
        setProgress(0, "Error loading image");
        alert("Failed to load the image. Try a different file.");
    };
}

// ========== EXPORT FOR REUSE ==========
if (typeof module !== "undefined" && module.exports) {
    module.exports = { resizeImage, getAspectRatio, QUALITY_SETTINGS };
}
