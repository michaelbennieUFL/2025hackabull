// Helper: Convert a data URL to a Blob
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const base64 = parts[1];
  const binary = atob(base64);
  let array = [];
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], { type: 'image/png' });
}

// Helper: Convert base64 string to an Image object
function base64ToImage(base64) {
  const img = new Image();
  img.src = base64;
  return img;
}

// Helper: Generate a random HEX color
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Helper: Convert HEX color to an RGB object
function hexToRgb(hex) {
  const bigint = parseInt(hex.substring(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

// Helper: Apply a colored mask on the canvas using a mask image and a specified region
function applyColoredMask(ctx, maskImg, color, x0, y0, x1, y1) {
  const width = x1 - x0;
  const height = y1 - y0;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');

  // Draw the mask on an offscreen canvas
  offCtx.drawImage(maskImg, x0, y0, width, height, 0, 0, width, height);
  const maskData = offCtx.getImageData(0, 0, width, height);
  const maskPixels = maskData.data;
  const originalData = ctx.getImageData(x0, y0, width, height);
  const originalPixels = originalData.data;
  const rgbColor = hexToRgb(color);
  const transparency = 0.4;

  // Apply color blending only to pixels marked by the mask (where blue channel > 0)
  for (let i = 0; i < maskPixels.length; i += 4) {
    if (maskPixels[i + 2] > 0) {
      originalPixels[i] = originalPixels[i] * (1 - transparency) + rgbColor.r * transparency;
      originalPixels[i + 1] = originalPixels[i + 1] * (1 - transparency) + rgbColor.g * transparency;
      originalPixels[i + 2] = originalPixels[i + 2] * (1 - transparency) + rgbColor.b * transparency;
      originalPixels[i + 3] = 150;
    }
  }
  ctx.putImageData(originalData, x0, y0);
}

// Annotate the base image with segmentation results
function annotateImage(baseImgDataURL, results) {
  const baseImage = new Image();
  baseImage.onload = () => {
    const canvas = document.getElementById('annotatedCanvas');
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(baseImage, 0, 0);

    results.forEach(item => {
      const y0 = item.box_2d[0],
            x0 = item.box_2d[1],
            y1 = item.box_2d[2],
            x1 = item.box_2d[3];
      const boxWidth = x1 - x0;
      const boxHeight = y1 - y0;
      const color = getRandomColor();

      // Draw bounding box around the detected item
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x0, y0, boxWidth, boxHeight);

      // Draw label background and text
      ctx.fillStyle = color;
      ctx.font = "20px Arial";
      const textWidth = ctx.measureText(item.label).width;
      ctx.fillRect(x0, y0 - 24, textWidth + 8, 24);
      ctx.fillStyle = 'white';
      ctx.fillText(item.label, x0 + 4, y0 - 6);

      // Overlay the mask with a colored tint
      const maskImg = base64ToImage(item.mask);
      maskImg.onload = () => {
        applyColoredMask(ctx, maskImg, color, x0, y0, x1, y1);
      };
    });
    canvas.style.display = 'block';
  };
  baseImage.src = baseImgDataURL;
}

// Global functions for scanner modal
function closeScanner() {
  document.getElementById('scannerModal').style.display = 'none';
}

// Enables draggable functionality for the scanner modal
function dragElement(elmnt) {
  const header = document.getElementById("scannerHeader");
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (header) {
    header.onmousedown = dragMouseDown;
  }
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Combine initialization routines after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Scanner and Camera Setup
  const video = document.getElementById('camera-stream');
  const canvasBuffer = document.createElement('canvas');
  const captureBtn = document.getElementById('capture-btn');

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      alert("Camera access denied or unavailable.");
      console.error(err);
    });

  captureBtn.addEventListener('click', async () => {
    canvasBuffer.width = video.videoWidth;
    canvasBuffer.height = video.videoHeight;
    const ctx = canvasBuffer.getContext('2d');
    ctx.drawImage(video, 0, 0, canvasBuffer.width, canvasBuffer.height);
    const dataURL = canvasBuffer.toDataURL('image/png');
    const blob = dataURLtoBlob(dataURL);
    const formData = new FormData();
    formData.append('image', blob, 'screenshot.png');

    try {
      const response = await fetch('http://127.0.0.1:5001/analyze/segment_items', {
        method: 'POST',
        body: formData
      });
      const results = await response.json();
      console.log("Segmentation results:", results);
      annotateImage(dataURL, results);
    } catch (error) {
      console.error("Error analyzing screenshot:", error);
      alert("Error analyzing screenshot");
    }
  });

  // Open scanner modal on button click
  const openScannerBtn = document.getElementById('openScannerBtn');
  openScannerBtn.addEventListener('click', () => {
    document.getElementById('scannerModal').style.display = 'block';
  });

  // Enable item selection (red border toggle)
  const selectedItems = new Set();
  document.querySelectorAll(".item").forEach(item => {
    item.addEventListener("click", function(e) {
      e.stopPropagation();
      console.log(`Item clicked: ${item.id}`);
      item.classList.toggle("selected");
      const itemId = item.id;
      if (selectedItems.has(itemId)) {
        selectedItems.delete(itemId);
      } else {
        selectedItems.add(itemId);
      }
    });
  });

  document.getElementById("addItemsBtn").addEventListener("click", function() {
    console.log("Selected items:", Array.from(selectedItems));
  });

  // Enable draggable modal functionality
  dragElement(document.getElementById("scannerModal"));
});
