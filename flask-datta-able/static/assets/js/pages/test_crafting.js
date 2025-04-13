// Wait for the document to finish loading
document.addEventListener("DOMContentLoaded", function () {
  loadRecipes();
});

// Global object to hold selected recipe details
let selectedRecipeObject = {
  name: "",
  materials: [],
  crafting: "",
  openTime: Date.now(),
};

// Simulate fetching recipes and materials (replace with a real API call as needed)
async function loadRecipes() {
  // Simulated materials array
  const materials = [
    { name: "stone", description: "A hard rock." },
    { name: "stick", description: "A long, thin piece of wood." },
    { name: "dry leaves", description: "Crispy, brown leaves." },
    { name: "pine needles", description: "Dried pine needles." },
    { name: "birch bark", description: "Strips of birch bark." },
  ];

  // Simulated recipes array
  const recipes = [
    {
      name: "Stone Axe",
      materials: [materials[0], materials[1]],
      crafting: "Combine stone and stick to form an axe.",
    },
    {
      name: "Fire Starter",
      materials: [materials[2], materials[3], materials[4]],
      crafting: "Combine dry leaves, pine needles, and birch bark to ignite a flame.",
    },
  ];

  const recipeList = document.getElementById("recipe-list");
  recipeList.innerHTML = "";
  recipes.forEach((recipe) => {
    const recipeItem = document.createElement("div");
    recipeItem.style.border = "1px solid #ccc";
    recipeItem.style.padding = "10px";
    recipeItem.style.margin = "10px";
    recipeItem.style.cursor = "pointer";
    recipeItem.innerHTML = `<strong>${recipe.name}</strong><br>${recipe.crafting}`;
    recipeItem.addEventListener("click", () => {
      selectedRecipeObject.name = recipe.name;
      selectedRecipeObject.materials = recipe.materials;
      selectedRecipeObject.crafting = recipe.crafting;
      displaySelectedRecipe();
    });
    recipeList.appendChild(recipeItem);
  });
}

// Display the selected recipe in the right‐side panel
function displaySelectedRecipe() {
  selectedRecipeObject.openTime = Date.now();
  // Expand the selected recipe panel
  document.getElementById("selected-recipe").style.width = "30%";
  document.getElementById("selected-recipe-name").innerHTML = selectedRecipeObject.name;
  document.getElementById("selected-recipe-description").innerHTML = selectedRecipeObject.crafting;

  const materialsContainer = document.getElementById("selected-recipe-materials");
  materialsContainer.innerHTML = "";
  selectedRecipeObject.materials.forEach((material) => {
    const materialDiv = document.createElement("div");
    materialDiv.style.padding = "5px";
    materialDiv.style.background = "#f0f0f0";
    materialDiv.style.margin = "2px";
    materialDiv.innerText = material.name;
    materialsContainer.appendChild(materialDiv);
  });

  // Ensure the Recipe Info view is shown and the Tutorial view is hidden
  document.getElementById("recipe-info").style.display = "block";
  document.getElementById("tutorial-section").style.display = "none";
}

// Close the selected recipe panel
function closeSelectedRecipe() {
  document.getElementById("selected-recipe").style.width = "0";
}

// Dummy save/unsave functions (replace with proper persistence as needed)
function saveSelectedRecipe() {
  console.log("Recipe saved:", selectedRecipeObject.name);
  document.getElementById("save-recipe-btn").style.display = "none";
  document.getElementById("saved-checkmark").style.display = "inline-block";
}

function unsaveSelectedRecipe() {
  console.log("Recipe unsaved:", selectedRecipeObject.name);
  document.getElementById("save-recipe-btn").style.display = "inline-block";
  document.getElementById("saved-checkmark").style.display = "none";
}

// ----------------------------
// Tutorial Section Functions
// ----------------------------

// Element references for tutorial section
const tutorialBtn = document.getElementById("tutorial-btn");
const tutorialSection = document.getElementById("tutorial-section");
const recipeInfo = document.getElementById("recipe-info");
const tutorialItemName = document.getElementById("tutorial-item-name");
const tutorialVideo = document.getElementById("tutorial-video-stream");
const tutorialCaptureBtn = document.getElementById("tutorial-capture-btn");
const konvaContainer = document.getElementById("konva-container");
const tutorialBackBtn = document.getElementById("tutorial-back-btn");

// Start the live camera stream for the tutorial view
function startTutorialCamera() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        tutorialVideo.srcObject = stream;
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
        alert("Camera access denied or unavailable.");
      });
  } else {
    alert("Camera not supported on this browser.");
  }
}

// Capture a frame from the video and create a draggable Konva image
tutorialCaptureBtn.addEventListener("click", () => {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = tutorialVideo.videoWidth;
  tempCanvas.height = tutorialVideo.videoHeight;
  const ctx = tempCanvas.getContext("2d");
  ctx.drawImage(tutorialVideo, 0, 0, tempCanvas.width, tempCanvas.height);
  const dataURL = tempCanvas.toDataURL("image/png");
  // Clear previous Konva content
  konvaContainer.innerHTML = "";
  const stage = new Konva.Stage({
    container: "konva-container",
    width: tempCanvas.width,
    height: tempCanvas.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  const imgObj = new Image();
  imgObj.onload = function () {
    const konvaImage = new Konva.Image({
      x: 0,
      y: 0,
      image: imgObj,
      width: tempCanvas.width,
      height: tempCanvas.height,
      draggable: true,
    });
    layer.add(konvaImage);
    layer.batchDraw();
  };
  imgObj.src = dataURL;
});

// Switch to the Tutorial view when the Tutorial button is clicked
tutorialBtn.addEventListener("click", () => {
  recipeInfo.style.display = "none";
  tutorialSection.style.display = "block";
  tutorialItemName.textContent = selectedRecipeObject.name;
  startTutorialCamera();
});

// The Back button stops the camera stream and returns to the Recipe Info view
tutorialBackBtn.addEventListener("click", () => {
  const stream = tutorialVideo.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  tutorialVideo.srcObject = null;
  tutorialSection.style.display = "none";
  recipeInfo.style.display = "block";
});
