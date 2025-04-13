const recipeList = document.getElementById("recipe-list");
const selectedRecipe = document.getElementById("selected-recipe");
const selectedRecipeName = document.getElementById("selected-recipe-name");
const selectedRecipeDescription = document.getElementById("selected-recipe-description");
const selectedRecipeMaterials = document.getElementById("selected-recipe-materials");
const saveRecipeBtn = document.getElementById("save-recipe-btn");
const savedCheckmark = document.getElementById("saved-checkmark");
const loadingSpinner = document.getElementById("loading-spinner");
const savedRecipesElement = document.getElementById("saved-recipes");
const modalOverlay = document.getElementById("modalOverlay");
const craftingCanvas = document.getElementById("crafting-canvas");
const selectedRecipeObject = {};
const savedRecipes = [];

const sleep = ms => new Promise(res => setTimeout(res, ms));

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
  
async function loadRecipes() {
    showLoadingAnimation();

    const recipes = await fetch("http://localhost:5001/analyze/find_recipes").then(res => res.json()).then(res => res.result.map(recipe => ({
        name: recipe.name,
        description: recipe.description,
        materials: recipe.materials,
        crafting: recipe.crafting
    }))).catch(() => []);

    if(recipes.length === 0) {
        recipeList.innerHTML = '<div class="text-center text-red-500">No recipes found. Please try again.</div>';
        return;
    }

    recipeList.innerHTML = "";
    for(const recipe of recipes) {
        const recipeItem = document.createElement("div");
        recipeItem.className = "cursor-pointer flex-1 flex flex-col gap-2 justify-between h-full p-4 shadow-xl bg-white rounded-md hover:shadow-xl hover:shadow-black/20 duration-300 transition-all";

        const nameElement = document.createElement("h5");
        nameElement.className = "font-bold mb-auto text-xl";
        nameElement.innerHTML = `${recipe.name}`;

        const craftingElement = document.createElement("p");
        craftingElement.className = "text-slate-900";
        craftingElement.innerHTML = `${recipe.crafting.slice(0, 250)}${recipe.crafting.length > 250 ? "..." : ""}`;

        const materialsElement = document.createElement("div");
        materialsElement.className = "flex flex-row h-24 justify-between items-center gap-2";

        for(const material of recipe.materials) {
            const materialItem = document.createElement("div");
            materialItem.className = "flex-1 material-item h-full shadow-sm shadow-black/20 rounded-md p-2 flex flex-col items-center justify-center gap-2";
            
            const materialImage = document.createElement("img");
            materialImage.className = "w-16 h-16 object-cover rounded-md aspect-square";
            materialImage.src = material.image || "https://via.placeholder.com/64";
            materialImage.alt = material.name;
            
            const materialName = document.createElement("span");
            materialName.className = "text-sm text-center";
            materialName.innerHTML = `${material.name[0].toUpperCase() + material.name.slice(1)}`;
            
            materialItem.appendChild(materialImage);
            materialItem.appendChild(materialName);
            materialsElement.appendChild(materialItem);
        }
        
        // Add all elements to the recipe item
        recipeItem.appendChild(nameElement);
        recipeItem.appendChild(craftingElement);
        recipeItem.appendChild(materialsElement);


        recipeItem.addEventListener("click", () => {
            selectedRecipeObject.name = recipe.name;
            selectedRecipeObject.description = recipe.description;
            selectedRecipeObject.materials = recipe.materials;
            selectedRecipeObject.crafting = recipe.crafting;
            displaySelectedRecipe();
        });


        recipeList.appendChild(recipeItem);
    }
}

loadRecipes();

async function saveSelectedRecipe() {
    try {
        // Show loading spinner and hide other buttons
        saveRecipeBtn.classList.add("hidden");
        loadingSpinner.classList.remove("hidden");
        savedCheckmark.classList.add("hidden");
        savedRecipes.push(selectedRecipeObject.name);

        const response = await fetch('http://localhost:5001/analyze/save_recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: selectedRecipeObject.name,
                description: selectedRecipeObject.description,
                materials: selectedRecipeObject.materials,
                crafting: selectedRecipeObject.crafting
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save recipe');
        }

        // Hide loading spinner and show saved state
        loadingSpinner.classList.add("hidden");
        savedCheckmark.classList.remove("hidden");

        // Refresh the saved recipes display
        await loadSavedRecipes();
    } catch (error) {
        console.error('Error saving recipe:', error);
        // Show error state and restore save button
        loadingSpinner.classList.add("hidden");
        saveRecipeBtn.classList.remove("hidden");
        alert('Failed to save recipe. Please try again.');
    }
}

function closeSelectedRecipe() {
    selectedRecipe.style.width = "0";
    craftingCanvas.classList.add("hidden");
    modalOverlay.classList.add("hidden");
    
    // Reset camera and canvas elements
    const video = document.getElementById('camera-stream');
    const canvas = document.getElementById('animation-canvas');
    const preProcessing = document.getElementById('pre-proccessing');
    const craftingInstructions = document.getElementById('crafting-instructions-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Reset UI elements
    video.classList.remove('hidden');
    canvas.classList.add('hidden');
    preProcessing.classList.remove('hidden');
    craftingInstructions.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    
    // Reset step indicator
    document.getElementById('step-indicator').textContent = 'Step 1';
    
    // Reset buttons
    document.getElementById('prev-step').disabled = true;
    document.getElementById('next-step').disabled = false;
    
    // Clear any existing animation
    if (window.animationFrame) {
        cancelAnimationFrame(window.animationFrame);
        window.animationFrame = null;
    }
}
function showLoadingAnimation() {
    recipeList.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-500"></div>
            <p class="text-slate-500">Loading recipes...</p>
        </div>
    `;
}

function displaySelectedRecipe() {
    modalOverlay.classList.remove("hidden");
    selectedRecipeObject.openTime = Date.now();
    selectedRecipe.style.width = "30%";
    selectedRecipeName.innerHTML = selectedRecipeObject.name;
    selectedRecipeDescription.innerHTML = selectedRecipeObject.crafting;
    selectedRecipeMaterials.replaceChildren();

    // Check if recipe is already saved
    const isSaved = savedRecipes.includes(selectedRecipeObject.name);
    
    if (isSaved) {
        saveRecipeBtn.classList.add("hidden");
        savedCheckmark.classList.remove("hidden");
    } else {
        saveRecipeBtn.classList.remove("hidden");
        savedCheckmark.classList.add("hidden");
    }

    for(const material of selectedRecipeObject.materials) {
        const materialItem = document.createElement("div");
        materialItem.className = "w-full p-4 bg-slate-100 rounded-md flex flex-col items-center gap-2";
        
        const materialImage = document.createElement("img");
        materialImage.className = "w-24 h-24 object-cover rounded-md aspect-square";
        materialImage.src = material.image || "https://via.placeholder.com/96";
        materialImage.alt = material.name;
        
        const materialName = document.createElement("span");
        materialName.className = "text-center font-medium";
        materialName.innerHTML = `${material.name[0].toUpperCase() + material.name.slice(1)}`;
        
        materialItem.appendChild(materialImage);
        materialItem.appendChild(materialName);
        selectedRecipeMaterials.appendChild(materialItem);
    }
}

document.addEventListener("click", (event) => {
    if (!selectedRecipe.contains(event.target) && Date.now() - selectedRecipeObject.openTime > 100) {
        closeSelectedRecipe();
    }
});

async function unsaveSelectedRecipe() {
    try {
        savedRecipes.splice(savedRecipes.indexOf(selectedRecipeObject.name), 1);
        // Show loading spinner and hide other buttons
        savedCheckmark.classList.add("hidden");
        loadingSpinner.classList.remove("hidden");

        const response = await fetch('http://localhost:5001/analyze/unsave_recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: selectedRecipeObject.name
            })
        });

        if (!response.ok) {
            throw new Error('Failed to unsave recipe');
        }

        // Hide loading spinner and show save button
        loadingSpinner.classList.add("hidden");
        saveRecipeBtn.classList.remove("hidden");

        // Refresh the saved recipes display
        await loadSavedRecipes();
        
        closeSelectedRecipe();
    } catch (error) {
        console.error('Error unsaving recipe:', error);
        // Show error state and restore saved state
        loadingSpinner.classList.add("hidden");
        savedCheckmark.classList.remove("hidden");
        alert('Failed to unsave recipe. Please try again.');
    }
}

async function loadSavedRecipes() {
    try {
        const response = await fetch('http://localhost:5001/analyze/get_saved_recipes');
        if (!response.ok) {
            throw new Error('Failed to fetch saved recipes');
        }

        const recipes = await response.json().then(res => res.result);
        savedRecipesElement.replaceChildren();

        for(const recipe of recipes) {
            savedRecipes.push(recipe.name);
            const recipeItem = document.createElement("div");
            recipeItem.className = "w-full flex flex-col items-center justify-between p-4 shadow-xl bg-white rounded-xl hover:shadow-2xl hover:shadow-black/20 duration-300 transition-all cursor-pointer";

            const nameElement = document.createElement("h3"); 
            nameElement.className = "font-bold text-xl text-amber-900 mb-2";
            nameElement.innerHTML = recipe.name;

            const craftingElement = document.createElement("p");
            craftingElement.className = "text-slate-700 mb-4";
            craftingElement.innerHTML = `${recipe.crafting.slice(0, 250)}${recipe.crafting.length > 250 ? "..." : ""}`;

            const materialsElement = document.createElement("div");
            materialsElement.className = "flex flex-row justify-center items-center gap-4 w-full";

            for(const material of recipe.materials) {
                const materialItem = document.createElement("div");
                materialItem.className = "flex flex-col items-center justify-center gap-2";
                
                const materialImage = document.createElement("img");
                materialImage.className = "w-16 h-16 object-cover rounded-md aspect-square";
                materialImage.src = material.image || "https://via.placeholder.com/64";
                materialImage.alt = material.name;
                
                const materialName = document.createElement("span");
                materialName.className = "text-sm text-center";
                materialName.innerHTML = `${material.name[0].toUpperCase() + material.name.slice(1)}`;
                
                materialItem.appendChild(materialImage);
                materialItem.appendChild(materialName);
                materialsElement.appendChild(materialItem);
            }

            recipeItem.appendChild(nameElement);
            recipeItem.appendChild(craftingElement);
            recipeItem.appendChild(materialsElement);

            recipeItem.addEventListener("click", () => {
                selectedRecipeObject.name = recipe.name;
                selectedRecipeObject.description = recipe.description;
                selectedRecipeObject.materials = recipe.materials;
                selectedRecipeObject.crafting = recipe.crafting;
                displaySelectedRecipe();
            });

            savedRecipesElement.appendChild(recipeItem);
        }

        if(savedRecipes.length === 0) {
            savedRecipesElement.innerHTML = '<div class="text-center text-red-500 p-4">No saved recipes found. Save a recipe!</div>';
        }
    } catch (error) {
        console.error('Error loading saved recipes:', error);
        savedRecipesElement.innerHTML = '<div class="text-center text-red-500 p-4">Failed to load saved recipes. Please try again.</div>';
    }
}

async function craftRecipe() {
    closeSelectedRecipe();
    craftingCanvas.classList.remove("hidden");
    modalOverlay.classList.remove("hidden");

    const craftingInstructionsContainer = document.getElementById('crafting-instructions-container');
    const preProccessingContainer = document.getElementById('pre-proccessing');
    const preProccessingItems = document.getElementById('pre-proccessing-items');
    preProccessingItems.replaceChildren();
    preProccessingContainer.classList.remove("hidden");
    craftingInstructionsContainer.classList.add("hidden");

    for(const material of selectedRecipeObject.materials) {
        const materialItem = document.createElement("div");
        materialItem.className = "flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow";

        const materialImage = document.createElement("img");
        materialImage.className = "w-24 h-24 object-cover rounded-lg";
        materialImage.src = material.image || "https://via.placeholder.com/96";
        materialImage.alt = material.name;

        const materialName = document.createElement("span");
        materialName.className = "text-slate-900 font-medium";
        materialName.textContent = material.name;

        materialItem.appendChild(materialImage);
        materialItem.appendChild(materialName);
        preProccessingItems.appendChild(materialItem);
    }

    // Create canvas
    const canvas = document.getElementById('animation-canvas');
    const ctx = canvas.getContext('2d');
    const stepIndicator = document.getElementById('step-indicator');
    const prevStepBtn = document.getElementById('prev-step');
    const nextStepBtn = document.getElementById('next-step');
    const loadingOverlay = document.getElementById('loading-overlay');
    const video = document.getElementById('camera-stream');
    const captureBtn = document.getElementById('capture-btn');

    // Set up the camera stream
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        video.srcObject = stream;
    } catch (err) {
        alert("Camera access denied or unavailable. Please allow camera access to use this feature.");
        console.error(err);
        closeSelectedRecipe();
        return;
    }

    // Calculate start position
    const startPosition = { x: 0, y: 0, radius: 0 };
    const endPosition = { x: 0, y: 0, radius: 0 };

    // Animation variables
    let animationFrame = null;
    let progress = 0;
    let steps = [];
    let currentStep = 0;
    
    const image = new Image();

    // Capture button sends screenshot to backend and annotates the image
    captureBtn.onclick = async () => {
        preProccessingContainer.classList.add("hidden");
        craftingInstructionsContainer.classList.remove("hidden");
        
        // Set canvas dimensions to match video exactly
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');

        video.style.display = 'none';
        canvas.classList.remove('hidden');

        const blob = dataURLtoBlob(dataURL);
        image.src = URL.createObjectURL(blob);

        image.onload = () => {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
        };

        try {
            loadingOverlay.classList.remove("hidden");

            const formData = new FormData();
            formData.append('target_object', selectedRecipeObject.name);
            formData.append('materials', JSON.stringify(selectedRecipeObject.materials.map(m => m.description)));
            formData.append('description', selectedRecipeObject.description);
            formData.append('image', dataURLtoBlob(dataURL), 'materials.png');

            const response = await fetch('http://localhost:5001/analyze/generate_instructions', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to generate instructions');
            }

            steps = await response.json();
            loadingOverlay.classList.add("hidden");
            updateStep(0);

            prevStepBtn.addEventListener('click', () => {
                if (currentStep > 0) {
                    updateStep(currentStep - 1);
                }
            });

            nextStepBtn.addEventListener('click', () => {
                if (currentStep < steps.length - 1) {
                    updateStep(currentStep + 1);
                }
            });

        } catch (error) {
            console.error('Error generating instructions:', error);
            loadingOverlay.classList.add("hidden");
            const errorElement = document.createElement('div');
            errorElement.className = 'mt-8 p-4 bg-red-100 text-red-700 rounded-lg';
            errorElement.textContent = 'Failed to generate crafting instructions. Please try again.';
            document.getElementById('crafting-canvas').appendChild(errorElement);
        }
    }

    function updateStep(stepIndex) {
        currentStep = stepIndex;
        const step = steps[stepIndex];

        document.getElementById('crafting-instructions').innerHTML = step.instruction;
        stepIndicator.textContent = `Step ${step.step}`;
        
        prevStepBtn.disabled = currentStep === 0;
        nextStepBtn.disabled = currentStep === steps.length - 1;

        const [y0start, x0start, y1start, x1start] = steps[currentStep].box_2d;
        const radiusStart = Math.hypot(x1start - x0start, y1start - y0start) / 2;
        startPosition.x = (x0start + x1start) / 2;
        startPosition.y = (y0start + y1start) / 2;
        startPosition.radius = radiusStart/2;

        const [y0end, x0end, y1end, x1end] = (steps[currentStep + 1] ?? steps[currentStep]).box_2d;
        const radiusEnd = Math.hypot(x1end - x0end, y1end - y0end) / 2; 
        endPosition.x = (x0end + x1end) / 2;
        endPosition.y = (y0end + y1end) / 2;
        endPosition.radius = radiusEnd/2;

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        progress = 0;
        animate();
    }
    
    async function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const currentX = startPosition.x + (endPosition.x - startPosition.x) * progress;
        const currentY = startPosition.y + (endPosition.y - startPosition.y) * progress;
        const currentRadius = startPosition.radius + (endPosition.radius - startPosition.radius) * progress;
        
        // Draw pulsing circle
        ctx.beginPath();
        ctx.arc(currentX / 1024 * canvas.width, currentY / 1024 * canvas.height, currentRadius / 1024 * canvas.height, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 69, 19, 0.3)'; // Amber color with transparency
        ctx.strokeStyle = 'rgb(139, 69, 19)'; // Amber color
        ctx.lineWidth = 4;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        progress += 0.01;
        if(progress > 1) {
            progress = 0;
            setTimeout(() => {
                animationFrame = requestAnimationFrame(animate);
            }, 1000);
        } else {
            animationFrame = requestAnimationFrame(animate);
        }
    }
}

window.addEventListener("load", () => {
    loadSavedRecipes();
});