const API_BASE = "http://localhost:5000/api";

// Text to ASCII
async function convertText() {
    const text = document.getElementById("textInput").value;
    const font = document.getElementById("fontSelect").value;

    const response = await fetch(`${API_BASE}/text-to-ascii`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, font })
    });
    const ascii = await response.text();
    document.getElementById("asciiTextOutput").innerText = ascii;
}

// Image to ASCII
async function convertImage() {
    const fileInput = document.getElementById("imageInput");
    if (!fileInput.files.length) return alert("Select an image first!");
    
    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    const response = await fetch(`${API_BASE}/image-to-ascii`, {
        method: "POST",
        body: formData
    });

    const ascii = await response.text();
    document.getElementById("asciiImageOutput").innerText = ascii;
}
