


var arr_touches = [];
var canvas, ctx;
var down = false;
var color = '#1a1a2e';
var width = 5;
var xPos = 0, yPos = 0;
var currentTool = 'pencil';

window.onload = function() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('mousedown', handleDown);
  canvas.addEventListener('mouseup', handleUp);
  canvas.addEventListener('mouseleave', handleUp);

  canvas.addEventListener("touchstart", handleStart, false);
  canvas.addEventListener("touchend", handleEnd, false);
  canvas.addEventListener("touchcancel", handleCancel, false);
  canvas.addEventListener("touchmove", handleTouchMove, false);

  document.getElementById('black').classList.add('active');
};

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
  document.getElementById('statusText').textContent = `x: ${Math.round(xPos)}, y: ${Math.round(yPos)}`;
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
  var touches = evt.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      evt.preventDefault();
      arr_touches.push(copyTouch(touches[i]));
      ctx.beginPath();
    }
  }
}

function handleTouchMove(evt) {
  var touches = evt.changedTouches;
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      evt.preventDefault();
      var idx = ongoingTouchIndexById(touches[i].identifier);
      if (idx >= 0) {
        ctx.beginPath();
        ctx.moveTo((arr_touches[idx].clientX - rect.left) * scaleX, (arr_touches[idx].clientY - rect.top) * scaleY);
        ctx.lineTo((touches[i].clientX - rect.left) * scaleX, (touches[i].clientY - rect.top) * scaleY);
        ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
        arr_touches.splice(idx, 1, copyTouch(touches[i]));
      }
    }
  }
}

function handleEnd(evt) {
  var touches = evt.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      evt.preventDefault();
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

function copyTouch(touch) {
  return { identifier: touch.identifier, clientX: touch.clientX, clientY: touch.clientY };
}

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

function changeColor(new_color) {
  color = new_color;
  currentTool = 'pencil';
  document.getElementById('pencilBtn').classList.add('active');
  document.getElementById('eraserBtn').classList.remove('active');
  document.getElementById('currentSwatch').style.background = new_color;
  document.getElementById('currentColorLabel').textContent = new_color;
  document.querySelectorAll('#colors button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#colors button').forEach(b => {
    var bg = window.getComputedStyle(b).backgroundColor;
    var hex = rgbToHex(bg);
    if (hex.toLowerCase() === new_color.toLowerCase()) b.classList.add('active');
  });
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('statusText').textContent = 'Canvas șters ✦';
}

function saveCanvas() {
  var link = document.createElement('a');
  link.download = 'desen.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  document.getElementById('statusText').textContent = 'Salvat! 💾';
}