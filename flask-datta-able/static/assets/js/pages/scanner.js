document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('camera-stream');
  const canvas = document.createElement('canvas');
  const preview = document.getElementById('preview');
  const button = document.getElementById('capture-btn');

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      alert("Camera access denied or unavailable.");
      console.error(err);
    });

  button.addEventListener('click', () => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/png');
    preview.src = dataURL;
    preview.style.display = 'block';
  });

  // Make the modal draggable once the DOM content is loaded
  dragElement(document.getElementById("scannerModal"));
});

function closeScanner() {
  document.getElementById('scannerModal').style.display = 'none';
}

function dragElement(elmnt) {
  const header = document.getElementById("scannerHeader");
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (header) {
    header.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // Get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // Calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
