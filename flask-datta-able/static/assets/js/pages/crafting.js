const recipeList = document.getElementById("recipe-list");
const selectedRecipe = document.getElementById("selected-recipe");
const selectedRecipeName = document.getElementById("selected-recipe-name");
const selectedRecipeDescription = document.getElementById("selected-recipe-description");
const selectedRecipeMaterials = document.getElementById("selected-recipe-materials");
const saveRecipeBtn = document.getElementById("save-recipe-btn");
const savedCheckmark = document.getElementById("saved-checkmark");
const loadingSpinner = document.getElementById("loading-spinner");
const savedRecipesElement = document.getElementById("saved-recipes");
const selectedRecipeObject = {};
const savedRecipes = [];

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
        recipeItem.className = "cursor-pointer flex-1 flex flex-col gap-2 justify-center h-full p-4 shadow-xl bg-white rounded-md hover:shadow-xl hover:shadow-black/20 duration-300 transition-all";

        const nameElement = document.createElement("h5");
        nameElement.className = "font-bold";
        nameElement.innerHTML = `${recipe.name}`;

        const craftingElement = document.createElement("p");
        craftingElement.className = "text-slate-900";
        craftingElement.innerHTML = `${recipe.crafting}`;

        const materialsElement = document.createElement("div");
        materialsElement.className = "flex flex-row justify-center items-center gap-2";

        for(const material of recipe.materials) {
            const materialItem = document.createElement("div");
            materialItem.className = "material-item";

            materialItem.innerHTML = `${material.name[0].toUpperCase() + material.name.slice(1)} (${material.quantity})`;

            materialItem.innerHTML = material.name[0].toUpperCase() + material.name.slice(1);

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
        materialItem.className = "w-full p-2 bg-slate-100 rounded-md text-center";
        materialItem.innerHTML = material.name[0].toUpperCase() + material.name.slice(1);
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
            recipeItem.className = "w-full flex flex-row items-center justify-between p-4 shadow-xl bg-white rounded-md hover:shadow-xl hover:shadow-black/20 duration-300 transition-all rounded-md cursor-pointer";

            const nameElement = document.createElement("h3"); 
            nameElement.className = "font-bold";
            nameElement.innerHTML = recipe.name;

            const craftingElement = document.createElement("p");
            craftingElement.className = "text-slate-600";
            craftingElement.innerHTML = recipe.crafting;

            const materialsElement = document.createElement("div");
            materialsElement.className = "flex flex-row justify-center items-center gap-2";

            for(const material of recipe.materials) {
                const materialItem = document.createElement("div");
                materialItem.className = "material-item";
                materialItem.innerHTML = `${material.name[0].toUpperCase() + material.name.slice(1)} (${material.quantity})`;
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
    } catch (error) {
        console.error('Error loading saved recipes:', error);
        savedRecipesElement.innerHTML = '<div class="text-center text-red-500">Failed to load saved recipes. Please try again.</div>';
    }
}

window.addEventListener("load", () => {
    loadSavedRecipes();
});
