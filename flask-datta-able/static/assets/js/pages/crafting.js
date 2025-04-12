const recipeList = document.getElementById("recipe-list");
const selectedRecipe = document.getElementById("selected-recipe");
const selectedRecipeName = document.getElementById("selected-recipe-name");
const selectedRecipeDescription = document.getElementById("selected-recipe-description");
const selectedRecipeMaterials = document.getElementById("selected-recipe-materials");

const selectedRecipeObject = {
    name: "",
    materials: [],
    crafting: ""
};

async function loadRecipes() {
    recipeList.innerHTML = "";

    /*const objects = JSON.parse(localStorage.getItem("objects") || "[]");
    if(!objects.length) {
        return;
    }

    const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ "objects": objects })
    });

    const data = await response.json(); */
    const data = [
        {
            "name": "Fireplace",
            "materials": [
                {
                    "name": "stone",
                    "size": "large",
                    "quantity": 2
                },
                {
                    "name": "stick",
                    "size": "small",
                    "quantity": 3
                },
                {
                    "name": "log",
                    "size": "large",
                    "quantity": 1
                }
            ],
            "crafting": "Take the stone and stick and log to the crafting table and craft the fireplace."
        },
        {
            "name": "Stone Pickaxe",
            "materials": [
                {
                    "name": "stone",    
                    "size": "large",
                    "quantity": 2
                },
                {
                    "name": "stick",
                    "size": "small",
                    "quantity": 3
                }
            ],
            "crafting": "Take the stone and stick to the crafting table and craft the stone pickaxe."
        },
        {
            "name": "Stone Axe",
            "materials": [
                {
                    "name": "stone",
                    "size": "large",
                    "quantity": 2
                },
                {
                    "name": "stick",
                    "size": "small",
                    "quantity": 3
                }
            ],
            "crafting": "Take the stone and stick to the crafting table and craft the stone axe."
        }
    ]
    console.log(data);

    for(const recipe of data) {
        const recipeItem = document.createElement("div");
        recipeItem.className = "cursor-pointerflex flex-col gap-2 justify-center h-full p-4 shadow-xl bg-white rounded-md hover:shadow-xl hover:shadow-black/20 duration-300 transition-all";

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
            materialsElement.appendChild(materialItem);
        }
        
        // Add all elements to the recipe item
        recipeItem.appendChild(nameElement);
        recipeItem.appendChild(craftingElement);
        recipeItem.appendChild(materialsElement);

        recipeItem.addEventListener("click", () => {
            selectedRecipeObject.name = recipe.name;
            selectedRecipeObject.materials = recipe.materials;
            selectedRecipeObject.crafting = recipe.crafting;
            displaySelectedRecipe();
        });

        recipeList.appendChild(recipeItem);
    }
}

function displaySelectedRecipe() {
    selectedRecipe.style.display = "flex";
    selectedRecipeName.innerHTML = selectedRecipeObject.name;
    selectedRecipeDescription.innerHTML = selectedRecipeObject.crafting;
    selectedRecipeMaterials.replaceChildren();

    for(const material of selectedRecipeObject.materials) {
        const materialItem = document.createElement("div");
        materialItem.className = "material-item";
        materialItem.innerHTML = `${material.name[0].toUpperCase() + material.name.slice(1)} (${material.quantity})`;
        selectedRecipeMaterials.appendChild(materialItem);
    }
}

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

        // Refresh the saved recipes display
        loadSavedRecipes();
    }
}

function closeSelectedRecipe() {
    selectedRecipe.style.display = "none";
    console.log("closeSelectedRecipe");
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
