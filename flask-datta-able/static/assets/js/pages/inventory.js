const video = document.getElementById('camera-stream');
const canvas = document.getElementById('annotatedCanvas');
const loading = document.getElementById('loading');
const ctx = canvas.getContext('2d');
const capture = document.getElementById('capture-btn');
const inventory = document.getElementById('inventory');

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

// Helper: Create a colored mask
function applyColoredMask(ctx, maskImg, color, x0, y0, x1, y1) {
  const width = x1 - x0;
  const height = y1 - y0;

  // Off-screen canvas for mask processing
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');

  // Draw mask onto off-screen canvas
  offCtx.drawImage(maskImg, x0, y0, width, height, 0, 0, width, height);

  // Get mask data
  const maskData = offCtx.getImageData(0, 0, width, height);
  const maskPixels = maskData.data;

  // Get original image data from main canvas
  const originalData = ctx.getImageData(x0, y0, width, height);
  const originalPixels = originalData.data;

  // Convert hex color to RGB
  const rgbColor = hexToRgb(color);

  const transparency = 0.3;
  // Apply color ONLY to pixels explicitly marked by the mask (alpha > 0)
  for (let i = 0; i < maskPixels.length; i += 4) {
    if (maskPixels[i + 2] > 0) {
      originalPixels[i] = originalPixels[i]*(1-transparency)+rgbColor.r*transparency;
      originalPixels[i + 1] = originalPixels[i+1]*(1-transparency)+rgbColor.g*transparency;
      originalPixels[i + 2] = originalPixels[i+2]*(1-transparency)+rgbColor.b*transparency;
      originalPixels[i + 3] = 150; // Slight transparency (adjustable)
    }
  }

  // Update main canvas with highlighted pixels
  ctx.putImageData(originalData, x0, y0);
}

// Helper: Convert hex to RGB
function hexToRgb(hex) {
  const bigint = parseInt(hex.substring(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}


// Helper: Convert base64 to Image object
function base64ToImage(base64) {
  const img = new Image();
  img.src = base64;
  return img;
}

// Helper: Generate random color
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Updated annotateImage function with mask overlay
function annotateImage(baseImgDataURL, results) {
  const baseImage = new Image();
  baseImage.onload = () => {
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    ctx.drawImage(baseImage, 0, 0);

    // Store results for click handling
    canvas.dataset.baseImage = baseImgDataURL;
    canvas.dataset.annotations = JSON.stringify(results);
    renderCanvas();

    video.style.display = 'none';
    canvas.style.display = 'block';
    loading.style.display = 'none';
  };
  baseImage.src = baseImgDataURL;
}

// Add click handling for annotation boxes
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const annotations = JSON.parse(canvas.dataset.annotations || '[]');
  const clickedAnnotation = annotations.find(item => {
    const [y0, x0, y1, x1] = item.box_2d;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  });

  if (clickedAnnotation) {
    showAddToInventoryModal(clickedAnnotation);
  }
});

// Function to show the add to inventory modal
function showAddToInventoryModal(annotation) {
  const modal = document.getElementById('addToInventoryModal');
  const itemDetails = document.getElementById('itemDetails');
  const cancelBtn = document.getElementById('cancelAddBtn');
  const confirmBtn = document.getElementById('confirmAddBtn');

  // Update item details
  itemDetails.textContent = `Item: ${annotation.label}`;

  // Show modal
  modal.classList.remove('hidden');

  // Handle cancel button
  cancelBtn.onclick = () => modal.classList.add('hidden');

  // Handle confirm button
  confirmBtn.onclick = () => {
    storeAnnotation(annotation);

    // Remove the clicked annotation from the dataset
    const remainingAnnotations = JSON.parse(canvas.dataset.annotations ?? "[]").filter(item => {
      const sameBox = item.box_2d.every((val, index) => val === annotation.box_2d[index]);
      return !sameBox;
    });
    canvas.dataset.annotations = JSON.stringify(remainingAnnotations);
  
    renderCanvas();

    modal.classList.add('hidden');
  };
}

async function deleteItem(item) {
  closeDetailModal();

  await fetch(`http://127.0.0.1:5001/analyze/delete_item`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: item.description
    })
  });
  updateInventoryDisplay();
}

async function storeAnnotation(annotation) {
  // Create a new Image from the mask base64 string
  const maskImage = new Image();
  await new Promise(resolve => {
    maskImage.src = annotation.mask;
    maskImage.onload = resolve;
  });

  const y0 = annotation.box_2d[0];
  const x0 = annotation.box_2d[1];
  const height = annotation.box_2d[2] - y0;
  const width = annotation.box_2d[3] - x0;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  tempCanvas.width = width;
  tempCanvas.height = height;
  
  const baseImage = new Image();
  baseImage.src = canvas.dataset.baseImage;
  await new Promise(resolve => baseImage.onload = resolve);

  // Draw the base image onto temp canvas, cropped to annotation bounds
  tempCtx.drawImage(baseImage, x0, y0, width, height, 0, 0, width, height);

  // Create a temporary canvas for the mask
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  
  // Draw the mask onto the mask canvas
  maskCtx.drawImage(maskImage, x0, y0, width, height, 0, 0, width, height);
  
  // Get the mask data
  const maskData = maskCtx.getImageData(0, 0, width, height);
  const maskPixels = maskData.data;
  
  // Get the original image data
  const imageData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  
  // Apply the mask to the image data
  for (let i = 0; i < pixels.length; i += 4) {
    // Use the red channel of the mask to determine transparency
    const maskValue = maskPixels[i];
    pixels[i + 3] = maskValue; // Set alpha channel based on mask
  }
  
  // Put the modified image data back
  tempCtx.putImageData(imageData, 0, 0);

  // Store the cropped image data URL with transparency
  annotation.image = tempCanvas.toDataURL('image/png');

  // Send the item data to the server
  try {
    const response = await fetch('http://127.0.0.1:5001/analyze/add_item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: annotation.label,
        description: annotation.description,
        image: annotation.image
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add item to inventory');
    }

    // Update the inventory display after successful addition
    updateInventoryDisplay();
  } catch (error) {
    console.error('Error adding item to inventory:', error);
    alert('Failed to add item to inventory');
  }
}

async function updateInventoryDisplay() {
  try {
    const response = await fetch('http://127.0.0.1:5001/analyze/get_items');
    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }
    
    const inventory = await response.json().then(res => res.result);
    const inventoryContainer = document.getElementById('inventory');
    
    // Clear existing content
    inventoryContainer.innerHTML = '';
    
    // Create grid items
    inventory.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'inventory-item bg-white rounded-xl p-4 flex flex-col items-center gap-4 shadow-xl hover:shadow-2xl hover:shadow-black/20 duration-300 transition-all cursor-pointer';
      itemElement.dataset.index = index;
      itemElement.onclick = () => showItemDetail(item);
      
      const imageContainer = document.createElement('div');
      imageContainer.className = 'w-full aspect-square rounded-xl overflow-hidden bg-amber-50';
      
      const image = document.createElement('img');
      image.className = 'w-full h-full object-cover';
      image.src = item.image;
      image.alt = item.name;
      
      const nameElement = document.createElement('h3');
      nameElement.className = 'font-bold text-xl text-amber-900 text-center';
      nameElement.textContent = item.name[0].toUpperCase() + item.name.slice(1);
      
      const descriptionElement = document.createElement('p');
      descriptionElement.className = 'text-slate-700 text-center text-sm';
      descriptionElement.textContent = item.description.slice(0, 100) + (item.description.length > 100 ? '...' : '');
      
      imageContainer.appendChild(image);
      itemElement.appendChild(imageContainer);
      itemElement.appendChild(nameElement);
      itemElement.appendChild(descriptionElement);
      
      inventoryContainer.appendChild(itemElement);
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    inventoryContainer.innerHTML = '<div class="col-span-4 text-center text-red-500 p-4">Failed to load inventory. Please try again.</div>';
  }
}

function showItemDetail(item) {
  const modal = document.getElementById('detailModal');
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('detailTitle');
  const image = document.getElementById('detailImage');
  const description = document.getElementById('detailDescription');
  
  // Update modal content
  title.textContent = item.name[0].toUpperCase() + item.name.slice(1);
  image.src = item.image;
  description.textContent = item.description || 'No description available';
  
  // Show modal and overlay
  modal.classList.remove('translate-x-full');
  overlay.classList.remove('hidden');

  const deleteBtn = document.getElementById('detailDeleteBtn');
  deleteBtn.onclick = () => deleteItem(item);
}

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  const overlay = document.getElementById('modalOverlay');
  
  modal.classList.add('translate-x-full');
  overlay.classList.add('hidden');
}

// Initialize camera stream and capture functionality for the Inventory Scanner
window.addEventListener('DOMContentLoaded', () => {
  updateInventoryDisplay();
  canvas.style.width = video.style.width;
  canvas.style.height = video.style.height;

  // Set up the camera stream
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      alert("Camera access denied or unavailable.");
      console.error(err);
    });

  // Capture button sends screenshot to backend and annotates the image
  capture.onclick = async () => {
    // Capture a frame from the video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/png');

    video.style.display = 'none';
    canvas.style.display = 'block';
    loading.style.display = 'block';

    // Create a Blob from the data URL
    const blob = dataURLtoBlob(dataURL);
    const formData = new FormData();
    formData.append('image', blob, 'screenshot.png');

    try {
      // Send POST request to backend endpoint for segmentation analysis
      const response = await fetch('http://127.0.0.1:5001/analyze/segment_items', {
        method: 'POST',
        body: formData
      });

      const results = await response.json();
      loading.style.display = 'none';
      results.forEach(result => result.color = getRandomColor());
      canvas.dataset.baseImage = dataURL;
      canvas.dataset.annotations = JSON.stringify(results);
      renderCanvas();
    } catch (error) {
      console.error("Error analyzing screenshot:", error);
      alert("Error analyzing screenshot");
    }
  };

  // Set up the Open Scanner button event
  const openScannerBtn = document.getElementById('openScannerBtn');
  openScannerBtn.addEventListener('click', () => {
    document.getElementById('scannerContainer').classList.remove('hidden');
  });
});

// Function to close the scanner modal
function closeScanner() {
  document.getElementById('scannerContainer').classList.add('hidden');
  
  // Reset the video stream
  video.style.display = 'block';
  canvas.style.display = 'none';
  loading.style.display = 'none';
}

async function renderCanvas() {
  const baseImage = new Image();
  baseImage.src = canvas.dataset.baseImage;
  await new Promise(resolve => baseImage.onload = resolve);

  canvas.width = baseImage.width;
  canvas.height = baseImage.height;
  ctx.drawImage(baseImage, 0, 0);

  const annotations = JSON.parse(canvas.dataset.annotations || '[]');

  for(const annotation of annotations) {
    const y0 = annotation.box_2d[0];
    const x0 = annotation.box_2d[1];
    const y1 = annotation.box_2d[2];
    const x1 = annotation.box_2d[3];
    const boxWidth = x1 - x0;
    const boxHeight = y1 - y0;

    // Draw bounding box
    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x0, y0, boxWidth, boxHeight);

    // Draw label background
    ctx.fillStyle = annotation.color;
    ctx.font = "20px Arial";

    const textWidth = ctx.measureText(annotation.label).width;
    ctx.fillRect(x0, y0 - 24, textWidth + 8, 24);

    // Label text
    ctx.fillStyle = 'white';
    ctx.fillText(annotation.label, x0 + 4, y0 - 6);

    // Overlay colored mask
    const maskImg = base64ToImage(annotation.mask);
    maskImg.onload = () => {
      applyColoredMask(ctx, maskImg, annotation.color, x0, y0, x1, y1);
    };
  }
}

updateInventoryDisplay();