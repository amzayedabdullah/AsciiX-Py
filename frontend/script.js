const API_BASE = "http://localhost:5000/api";

// Theme toggle
const themeSwitch = document.getElementById("themeSwitch");
themeSwitch.addEventListener("change", () => {
    document.body.classList.toggle("dark", themeSwitch.checked);
});

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

// Download Text ASCII
function downloadText() {
    const ascii = document.getElementById("asciiTextOutput").innerText;
    if (!ascii) return alert("No ASCII to download!");
    const blob = new Blob([ascii], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "text-ascii.txt";
    a.click();
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

// Download Image ASCII
function downloadImage() {
    const ascii = document.getElementById("asciiImageOutput").innerText;
    if (!ascii) return alert("No ASCII to download!");
    const blob = new Blob([ascii], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "image-ascii.txt";
    a.click();
}
