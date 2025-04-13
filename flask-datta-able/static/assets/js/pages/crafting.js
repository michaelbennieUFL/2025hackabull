const recipeList = document.getElementById("recipe-list");
const selectedRecipe = document.getElementById("selected-recipe");
const selectedRecipeName = document.getElementById("selected-recipe-name");
const selectedRecipeDescription = document.getElementById("selected-recipe-description");
const selectedRecipeMaterials = document.getElementById("selected-recipe-materials");

function saveSelectedRecipe() {
    console.log("saveSelectedRecipe");
}

function closeSelectedRecipe() {
    selectedRecipe.style.display = "none";
    console.log("closeSelectedRecipe");
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
    const savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
    const isSaved = savedRecipes.some(recipe => recipe.name === selectedRecipeObject.name);
    
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

loadRecipes();

function saveSelectedRecipe() {
    // Get existing saved recipes or initialize empty array
    const savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") || "[]");

    // Check if recipe already exists
    const recipeExists = savedRecipes.some(recipe => recipe.name === selectedRecipeObject.name);

    if (!recipeExists) {
        // Add new recipe to array
        savedRecipes.push({
            name: selectedRecipeObject.name,
            materials: selectedRecipeObject.materials,
            crafting: selectedRecipeObject.crafting
        });

        // Save updated array back to localStorage
        localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));

        // Show checkmark and hide save button
        saveRecipeBtn.classList.add("hidden");
        savedCheckmark.classList.remove("hidden");

        // Refresh the saved recipes display
        loadSavedRecipes();
    }
}

function closeSelectedRecipe() {
    selectedRecipe.style.width = "0px";
    document.body.style.overflow = ""; // Restore scrolling
}

function unsaveSelectedRecipe() {
    // Get existing saved recipes
    const savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
    
    // Filter out the current recipe
    const updatedRecipes = savedRecipes.filter(recipe => recipe.name !== selectedRecipeObject.name);
    
    // Save updated array back to localStorage
    localStorage.setItem("savedRecipes", JSON.stringify(updatedRecipes));
    
    // Update UI
    saveRecipeBtn.classList.remove("hidden");
    savedCheckmark.classList.add("hidden");
    
    // Refresh the saved recipes display
    loadSavedRecipes();
}

// Load saved recipes from localStorage
function loadSavedRecipes() {
    const savedRecipesElement = document.getElementById("saved-recipes");
    const savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") || "[]");

    savedRecipesElement.replaceChildren();

    for(const recipe of savedRecipes) {
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
            selectedRecipeObject.materials = recipe.materials;
            selectedRecipeObject.crafting = recipe.crafting;
            displaySelectedRecipe();
        });

        savedRecipesElement.appendChild(recipeItem);
    }
}

loadSavedRecipes();
