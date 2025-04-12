

document.addEventListener('DOMContentLoaded', function() {
  let current_slot = null;
  let status_click = false;
  let current_itemId = null;
  let current_itemType = null;
  let current_itemValue = null;

  const items = document.querySelectorAll('.item');

  items.forEach((item) => {
    item.addEventListener('click', moveItem);
    item.addEventListener('contextmenu', moveItem);
    item.setAttribute('draggable', false);
  });

  function moveItem(e) {
    e.preventDefault();
    const item = this;
    let waitItem = null;

    let ghostItem = item.cloneNode(true);
    ghostItem.setAttribute('class', 'ghostItem');
    item.classList.add('invisible');

    let shiftX = ghostItem.getBoundingClientRect().left + 20;
    let shiftY = ghostItem.getBoundingClientRect().top + 20;

    ghostItem.style.position = 'absolute';
    ghostItem.style.zIndex = 1000;
    document.body.append(ghostItem);

    ghostItem.onclick = function(e) {
      if (current_itemId && current_itemId !== item.parentNode.id) {
        let area = document.getElementById(current_itemId);
        let free_space = !!!area.firstElementChild;

        if (free_space) {
          area.append(item);
        } else if (current_itemType === item.id) {
          let destiny = area.firstElementChild.lastElementChild.innerHTML;
          let origin = item.lastElementChild.innerHTML;
          let total = parseInt(destiny) + parseInt(origin);
          area.firstElementChild.lastElementChild.innerHTML = total;
          item.remove();
        } else {
          item.parentNode.append(area.firstElementChild);
          area.append(item);
        }
      }
      if (item) item.classList.remove('invisible');
      ghostItem.remove();
      status_click = !status_click;
    };

    ghostItem.oncontextmenu = function(e) {
      e.preventDefault();
      if (current_itemId && current_itemId !== item.parentNode.id) {
        let area = document.getElementById(current_itemId);
        let free_space = !!!area.firstElementChild;
        if (free_space) {
          let newItem = item.cloneNode(true);
          newItem.addEventListener('click', moveItem);
          newItem.addEventListener('contextmenu', moveItem);
          newItem.setAttribute('draggable', false);
          if (parseInt(item.lastElementChild.innerHTML) === 1) {
            ghostItem.remove();
            status_click = !status_click;
            item.remove();
          } else {
            item.lastElementChild.innerHTML =
              parseInt(item.lastElementChild.innerHTML) - 1;
            ghostItem.lastElementChild.innerHTML =
              parseInt(ghostItem.lastElementChild.innerHTML) - 1;
          }
          newItem.lastElementChild.innerHTML = 1;
          area.append(newItem);
          newItem.classList.remove('invisible');
        } else if (current_itemType === item.id) {
          if (parseInt(item.lastElementChild.innerHTML) === 1) {
            ghostItem.remove();
            status_click = !status_click;
            item.remove();
          }
          let destiny = parseInt(area.firstElementChild.lastElementChild.innerHTML);
          let origin = parseInt(item.lastElementChild.innerHTML);
          let ghost = parseInt(ghostItem.lastElementChild.innerHTML);

          area.firstElementChild.lastElementChild.innerHTML = destiny + 1;
          item.lastElementChild.innerHTML = origin - 1;
          ghostItem.lastElementChild.innerHTML = ghost - 1;
        }
      }
    };

    status_click = !status_click;

    if (status_click) {
      moveAt(e.pageX, e.pageY);
    }

    function moveAt(pageX, pageY) {
      ghostItem.style.left = pageX - shiftX + 'px';
      ghostItem.style.top = pageY - shiftY + 'px';
    }

    function onMouseMove(e) {
      if (status_click) {
        moveAt(e.pageX, e.pageY);
      }
      ghostItem.hidden = true;
      let elemBelow = document.elementFromPoint(e.clientX, e.clientY);
      ghostItem.hidden = false;

      if (!elemBelow) return;
      let droppableBelow = elemBelow.closest('.slot');
      if (current_slot !== droppableBelow) {
        if (current_slot) {
          leaveDroppable(current_slot);
        }
        current_slot = droppableBelow;
        if (current_slot) {
          enterDroppable(current_slot);
        }
      }
    }

    document.addEventListener('mousemove', onMouseMove);
  }

  function enterDroppable(elem) {
    current_itemId = elem.id;
    if (elem.firstElementChild) {
      current_itemType = elem.firstElementChild.id;
      let child = elem.firstElementChild;
      current_itemValue = child.lastElementChild.innerHTML;
    }
  }

  function leaveDroppable(elem) {
    current_itemId = null;
    current_itemType = null;
    current_itemValue = null;
    // Declare free_space locally if needed.
    let free_space = false;
  }
});
