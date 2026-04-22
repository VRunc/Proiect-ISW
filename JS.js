var arr_touches = [];
var canvas, ctx, canvasWrapper;
var down = false;
var color = '#1a1a2e';
var width = 5;
var xPos = 0, yPos = 0;
var currentTool = 'pencil';
var currentZoom = 1;

window.onload = function() {
  canvas = document.getElementById('canvas');
  canvasWrapper = document.getElementById('canvasWrapper');
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Delay initial resize slightly to allow CSS Flexbox to render fully
  setTimeout(resizeCanvas, 50);

  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('mousedown', handleDown);
  canvas.addEventListener('mouseup', handleUp);
  canvas.addEventListener('mouseleave', handleUp);

  canvas.addEventListener("touchstart", handleStart, {passive: false});
  canvas.addEventListener("touchend", handleEnd, false);
  canvas.addEventListener("touchcancel", handleCancel, false);
  canvas.addEventListener("touchmove", handleTouchMove, {passive: false});

  window.addEventListener('resize', debounce(resizeCanvas, 200));
  
  // Register Paste Event Listener
  window.addEventListener('paste', handlePaste);

  // Close custom panel when clicking outside
  document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('customPickerWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById('customPickerPanel').classList.remove('visible');
    }
  });

  document.getElementById('black').classList.add('active');
};

function handlePaste(e) {
  var items = e.clipboardData || e.originalEvent.clipboardData;
  if (!items) return;
  
  var clipboardItems = items.items;
  for (var i = 0; i < clipboardItems.length; i++) {
    // Look for image MIME type
    if (clipboardItems[i].type.indexOf("image") !== -1) {
      var blob = clipboardItems[i].getAsFile();
      var img = new Image();
      
      img.onload = function() {
        // Evaluate if canvas buffer needs to expand to accommodate the image
        let newWidth = Math.max(canvas.width, img.width);
        let newHeight = Math.max(canvas.height, img.height);
        
        if (newWidth > canvas.width || newHeight > canvas.height) {
          // Save current canvas state
          let tempCanvas = document.createElement('canvas');
          let tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCtx.drawImage(canvas, 0, 0);

          // Apply expanded dimensions
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          // Fill background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Restore drawing and context settings
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
        
        // Draw the pasted image at top-left
        ctx.drawImage(img, 0, 0);
        document.getElementById('statusText').textContent = 'Imagine lipită din clipboard 📋';
        applyZoom(); // Apply CSS scaling if buffer dimension was updated
      };
      
      var URLObj = window.URL || window.webkitURL;
      img.src = URLObj.createObjectURL(blob);
      
      // Stop iteration after finding the first image
      break; 
    }
  }
}

function resizeCanvas() {
  if (!canvas || !canvasWrapper) return;
  
  let rect = canvasWrapper.getBoundingClientRect();
  let newWidth = Math.max(canvas.width || 0, rect.width);
  let newHeight = Math.max(canvas.height || 0, rect.height);

  if (canvas.width === newWidth && canvas.height === newHeight) {
      applyZoom();
      return;
  }

  let tempCanvas = document.createElement('canvas');
  let tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  
  if (canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0);
  }

  canvas.width = newWidth;
  canvas.height = newHeight;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (tempCanvas.width > 0 && tempCanvas.height > 0) {
      ctx.drawImage(tempCanvas, 0, 0);
  }
  
  applyZoom();
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function adjustZoom(factor) {
  currentZoom += factor;
  if (currentZoom < 0.2) currentZoom = 0.2;
  if (currentZoom > 5) currentZoom = 5;
  applyZoom();
}

function resetZoom() {
  currentZoom = 1;
  applyZoom();
}

function applyZoom() {
  canvas.style.width = (canvas.width * currentZoom) + 'px';
  canvas.style.height = (canvas.height * currentZoom) + 'px';
  document.getElementById('statusText').textContent = `Zoom: ${Math.round(currentZoom * 100)}%`;
}

function getCanvasPos(e) {
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function handleMove(e) {
  var pos = getCanvasPos(e);
  xPos = pos.x; yPos = pos.y;
  if (down) {
    ctx.lineTo(xPos, yPos);
    ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function handleDown(e) {
  down = true;
  var pos = getCanvasPos(e);
  xPos = pos.x; yPos = pos.y;
  ctx.beginPath();
  ctx.moveTo(xPos, yPos);
}

function handleUp() { down = false; }

function handleStart(evt) {
  evt.preventDefault();
  var touches = evt.changedTouches;
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;

  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      arr_touches.push(copyTouch(touches[i]));
      ctx.beginPath();
      var startX = (touches[i].clientX - rect.left) * scaleX;
      var startY = (touches[i].clientY - rect.top) * scaleY;
      ctx.moveTo(startX, startY);
    }
  }
}

function handleTouchMove(evt) {
  evt.preventDefault();
  var touches = evt.changedTouches;
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  
  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      var idx = ongoingTouchIndexById(touches[i].identifier);
      if (idx >= 0) {
        ctx.lineTo((touches[i].clientX - rect.left) * scaleX, (touches[i].clientY - rect.top) * scaleY);
        ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = width;
        ctx.stroke();
        arr_touches.splice(idx, 1, copyTouch(touches[i]));
      }
    }
  }
}

function handleEnd(evt) {
  evt.preventDefault();
  var touches = evt.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      var idx = ongoingTouchIndexById(touches[i].identifier);
      if (idx >= 0) arr_touches.splice(idx, 1);
    }
  }
}

function handleCancel(evt) {
  evt.preventDefault();
  var touches = evt.changedTouches;
  for (var i = 0; i < touches.length; i++) arr_touches.splice(i, 1);
}

function copyTouch(touch) { return { identifier: touch.identifier, clientX: touch.clientX, clientY: touch.clientY }; }

function ongoingTouchIndexById(idToFind) {
  for (var i = 0; i < arr_touches.length; i++) {
    if (arr_touches[i].identifier == idToFind) return i;
  }
  return -1;
}

function isValidTouch(touch) {
  var rect = canvas.getBoundingClientRect();
  return touch.clientX >= rect.left && touch.clientX <= rect.right &&
         touch.clientY >= rect.top  && touch.clientY <= rect.bottom;
}

function toggleCustomPicker() {
  document.getElementById('customPickerPanel').classList.toggle('visible');
}

function applyHexInput() {
  var inputVal = document.getElementById('hexInput').value.trim();
  if (/^([0-9A-F]{3}){1,2}$/i.test(inputVal)) {
    changeColor('#' + inputVal);
    document.getElementById('customPickerPanel').classList.remove('visible');
  } else {
    document.getElementById('statusText').textContent = 'Cod Hex invalid.';
  }
}

function changeColor(new_color) {
  color = new_color;
  currentTool = 'pencil';
  document.getElementById('pencilBtn').classList.add('active');
  document.getElementById('eraserBtn').classList.remove('active');
  document.getElementById('currentSwatch').style.background = new_color;
  document.getElementById('currentColorLabel').textContent = new_color;
  
  document.querySelectorAll('#colors > button, #customColorBtn').forEach(b => b.classList.remove('active'));
  
  let found = false;
  document.querySelectorAll('#colors > button').forEach(b => {
    if(b.id === 'customColorBtn') return;
    var bg = window.getComputedStyle(b).backgroundColor;
    var hex = rgbToHex(bg);
    if (hex.toLowerCase() === new_color.toLowerCase()) {
      b.classList.add('active');
      found = true;
    }
  });

  if(!found) {
    document.getElementById('customColorBtn').classList.add('active');
    document.getElementById('customColorBtn').style.background = new_color;
  }
}

function rgbToHex(rgb) {
  var result = rgb.match(/\d+/g);
  if (!result) return rgb;
  return '#' + result.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
}

function changeSize(val) {
  width = parseInt(val);
  ctx.lineWidth = width;
  var dot = document.getElementById('sizeDot');
  var s = Math.min(val, 30);
  dot.style.width = s + 'px';
  dot.style.height = s + 'px';
}

function setTool(tool) {
  currentTool = tool;
  document.getElementById('pencilBtn').classList.toggle('active', tool === 'pencil');
  document.getElementById('eraserBtn').classList.toggle('active', tool === 'eraser');
}

function clearCanvas() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  document.getElementById('statusText').textContent = 'Canvas șters ✦';
}

function saveCanvas() {
  var link = document.createElement('a');
  link.download = 'desen.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  document.getElementById('statusText').textContent = 'Salvat! 💾';
}