// ============================================================================
// Sketch Principal: El Mito de Ícaro y Dédalo (Con Automatización OSC para Resolume)
// ============================================================================

let video = null;
let pose = null;
let cameraInstance = null;
let poses = [];
let feathers = [];
let floatingLeaves = []; 
let seagulls = [];
let bgClouds = []; 
let cloudSparkles = []; 
let airLines = [];         
let characterAirLines = []; 
let novilloSparkles = []; 

// Variables de imágenes de alas, elementos y novillo
let featherImg = null;
let nubeImg = null;      
let leavesImg = null;
let personajeImg = null;
let alasCerradasImg = null; 
let alasAbiertasImg = null; 
let icaroCayendoImg = null; 
let novilloImg = null; 

// Control de inicio y estado
let gameStarted = false;
let resolumeSenalEnviada = false; // Bandera para disparar Resolume una sola vez al terminar

// Control de audios
let sndAmbiente = null;
let sndAleteo = null;
let sndViento = null;
let sndFuego = null;
let sndFuego2 = null;
let sndFinal = null;

let thunderNoise = null;
let thunderEnv = null;

let playingAmbiente = false;
let playingAleteo = false;
let playingViento = false;
let playingFuego = false;
let playingFuego2 = false;
let playingFinal = false;
let aleteoFaded = false;
let audioEndingFaded = false; 

// Pausa
let isPaused = false;
let pauseStartMillis = 0;
let totalPausedDuration = 0;

// Temporización y vuelo
let startTime = 0;
const STORY_DURATION = 12000;      
const TRANSITION_DURATION = 2500;  
const FLIGHT_START = STORY_DURATION + TRANSITION_DURATION; 

let interactiveProgress = 0.0;
let progress = 0.0;

let cameraStarted = false;
let cameraShutDown = false;
let frameCounter = 0; 
let lastAudioUpdate = 0;

// Aleteo, tracking y control de inactividad
let wingOpenness = 0.0; 
let visualWingAnim = 0.0; 
let lastWingOpenness = 0.0; 
let alasAlpha = 0.0; 
let flapStrength = 0;
let noFlapTimer = 0;

let lightningFlash = 0;
let currentLightning = null;
let lightningTriggered = false;

let explosionTriggered = false;
let explosionFlash = 0;
let epilogueStartTime = 0;

function preload() {
  featherImg      = loadImage('pluma.png');
  nubeImg         = loadImage('nube.png');
  leavesImg       = loadImage('hojas.png');
  personajeImg    = loadImage('personaje.png');
  alasCerradasImg = loadImage('alascerradas.png');
  alasAbiertasImg = loadImage('alasabiertas.png');
  icaroCayendoImg = loadImage('icarocae.png');
  novilloImg      = loadImage('novillo.png'); 
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);

  soundFormats('mp3');
  try {
    sndAmbiente = loadSound('1AMBIENTE.mp3');
    sndAleteo   = loadSound('2ALETEO.mp3');
    sndViento   = loadSound('viento.mp3');
    sndFuego    = loadSound('3FUEGO.mp3');
    sndFuego2   = loadSound('FUEGO2.mp3');
    sndFinal    = loadSound('4FINAL.mp3');
  } catch(e) {
    console.log("Audio omitido o cargando en segundo plano.");
  }

  thunderEnv = new p5.Envelope();
  thunderEnv.setADSR(0.01, 1.2, 0.1, 0.8);
  thunderEnv.setRange(0.8, 0);
  thunderNoise = new p5.Noise('brown');
  thunderNoise.amp(thunderEnv);
  thunderNoise.start();

  for (let i = 0; i < 28; i++) {
    novilloSparkles.push({
      angle: random(TWO_PI),
      distRadius: random(50, 150),
      size: random(3, 7),
      speed: random(0.015, 0.045),
      alphaOffset: random(TWO_PI)
    });
  }

  for (let i = 0; i < 7; i++) {
    bgClouds.push({
      x: random(width * 0.15, width * 0.85),
      y: random(-100, height + 100),
      speedY: random(1.5, 3.0),
      sizeW: random(280, 500),
      sizeH: random(100, 180),
      alpha: random(80, 150)
    });
  }

  for (let i = 0; i < 20; i++) {
    cloudSparkles.push({
      x: random(-width * 0.35, width * 0.35),
      y: random(-height * 0.18, height * 0.18),
      size: random(2, 5),
      phase: random(TWO_PI),
      speed: random(0.03, 0.08)
    });
  }

  for (let i = 0; i < 15; i++) {
    airLines.push({
      x: random(-width * 0.3, width * 0.3),
      y: random(height * 0.05, height * 0.35),
      length: random(30, 70),
      speed: random(5.0, 9.5),
      alpha: random(50, 150)
    });
  }

  for (let i = 0; i < 12; i++) {
    characterAirLines.push({
      x: random(-width * 0.18, width * 0.18),
      y: random(height * 0.05, height * 0.30),
      length: random(20, 50),
      speed: random(4.0, 7.5),
      alpha: random(70, 180)
    });
  }

  for (let i = 0; i < 4; i++) {
    seagulls.push({
      x: random(-width * 0.5, 0),
      y: random(height * 0.2, height * 0.6),
      vx: random(3.5, 5.5),
      size: random(16, 28),
      wingAngle: random(TWO_PI),
      wingSpeed: random(0.08, 0.14)
    });
  }
}

function mousePressed() {
  userStartAudio();

  if (!gameStarted) {
    let novilloX = width / 2;
    let novilloY = height * 0.36; 
    let d = dist(mouseX, mouseY, novilloX, novilloY);
    
    if (d < 100) {
      gameStarted = true;
      startTime = millis();
      
      if (sndAmbiente && sndAmbiente.isLoaded() && !sndAmbiente.isPlaying()) {
        sndAmbiente.loop();
        sndAmbiente.setVolume(0.35);
        playingAmbiente = true;
      }
    }
    return;
  }

  isPaused = !isPaused;

  if (isPaused) {
    pauseStartMillis = millis();
    pauseAllSounds();
  } else {
    totalPausedDuration += (millis() - pauseStartMillis);
    resumeCurrentSounds();
  }
}

function pauseAllSounds() {
  if (sndAmbiente && sndAmbiente.isPlaying()) sndAmbiente.pause();
  if (sndAleteo && sndAleteo.isPlaying()) sndAleteo.pause();
  if (sndViento && sndViento.isPlaying()) sndViento.pause();
  if (sndFuego && sndFuego.isPlaying()) sndFuego.pause();
  if (sndFuego2 && sndFuego2.isPlaying()) sndFuego2.pause();
  if (sndFinal && sndFinal.isPlaying()) sndFinal.pause();
}

function resumeCurrentSounds() {
  if (playingAmbiente && sndAmbiente) sndAmbiente.loop();
  if (playingAleteo && sndAleteo && !playingFuego) sndAleteo.loop();
  if (playingViento && sndViento) sndViento.loop();
  if (playingFuego && sndFuego) sndFuego.loop();
  if (playingFuego2 && sndFuego2) sndFuego2.loop();
  if (playingFinal && sndFinal) sndFinal.loop();
}

function draw() {
  if (!gameStarted) {
    drawStartScreen();
    return;
  }

  if (isPaused) {
    drawPauseOverlay();
    return;
  }

  let elapsed = (millis() - totalPausedDuration) - startTime;

  if (elapsed > FLIGHT_START && !explosionTriggered) {
    if (!cameraStarted) {
      startCameraTracking();
    }
    
    frameCounter++;
    let targetWing = 0.0;

    if (poses.length > 0 && frameCounter % 2 === 0) {
      let leftWrist = getPoint(15);
      let rightWrist = getPoint(16);
      let leftShoulder = getPoint(11);
      let rightShoulder = getPoint(12);

      if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
        let wristsDist = dist(leftWrist.x, leftWrist.y, rightWrist.x, rightWrist.y);
        let shoulderDist = dist(leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y);

        targetWing = map(wristsDist, shoulderDist * 0.7, shoulderDist * 1.6, 0, 1, true);
      }
    }

    wingOpenness = lerp(wingOpenness, targetWing, 0.2); 
    visualWingAnim = lerp(visualWingAnim, wingOpenness, 0.25); 
    flapStrength = wingOpenness * 12;

    let wingDelta = abs(wingOpenness - lastWingOpenness);
    lastWingOpenness = wingOpenness;

    if (wingOpenness > 0.15 && wingDelta > 0.002) {
      interactiveProgress += map(wingOpenness, 0.15, 1.0, 0.0008, 0.0025, true);
      noFlapTimer = 0; 
    } else {
      noFlapTimer += deltaTime; 
    }

    interactiveProgress = constrain(interactiveProgress, 0, 1);
    progress = interactiveProgress;

    if (progress >= 0.88 && !cameraShutDown) {
      stopCameraTracking();
    }
  } else if (elapsed <= FLIGHT_START) {
    progress = 0;
    wingOpenness = 0;
    visualWingAnim = 0;
    lastWingOpenness = 0;
    noFlapTimer = 0;
  }

  handleSequentialAudio(elapsed);

  if (playingAleteo && sndAleteo && sndAleteo.isPlaying() && millis() - lastAudioUpdate > 150) {
    let flapVol = map(flapStrength, 0, 12, 0.2, 0.65, true);
    sndAleteo.setVolume(flapVol, 0.1);
    lastAudioUpdate = millis();
  }

  // 1. Fondo y nubes
  drawAtmosphere(elapsed);
  drawAscendingBackgroundClouds(elapsed); 
  drawCenteredSingleCloud(elapsed);
  drawTopExtraCloud(elapsed); 
  drawLeftCloud(elapsed);     

  // 2. TEXTOS INICIALES DEL MITO
  if (elapsed >= 0 && elapsed < STORY_DURATION) {
    drawCaesarText("EL MITO", width / 2, height * 0.18, min(width * 0.11, 95), elapsed);
    drawCaesarText("DE ÍCARO Y DÉDALO", width / 2, height * 0.35, min(width * 0.055, 48), elapsed);
  }

  if (personajeImg && personajeImg.width > 0 && elapsed > FLIGHT_START && !explosionTriggered) {
    push();
    let charX = width / 2;
    let charY = height * 0.82; 

    strokeWeight(2);
    let speedMultLines = map(progress, 0, 1, 1.2, 5.0, true);
    if (!explosionTriggered && progress >= 0.10 && progress < 0.30) {
      speedMultLines = 3.8;
    }
    if (!explosionTriggered && progress >= 0.32 && progress < 0.52) speedMultLines = 3.5;
    if (noFlapTimer > 1800 && elapsed > FLIGHT_START) speedMultLines = 0;

    for (let cl of characterAirLines) {
      cl.y += (cl.speed * speedMultLines); 
      if (cl.y > height * 0.30) {
        cl.y = -height * 0.12;
        cl.x = random(-width * 0.18, width * 0.18);
      }
      stroke(255, 255, 255, cl.alpha * 0.85);
      let lineTopY = (charY - 120) + cl.y;
      let lineBotY = lineTopY + cl.length;
      line(charX + cl.x, lineTopY, charX + cl.x, lineBotY);
    }

    imageMode(CENTER);
    
    let charTintR = 255;
    let charTintG = map(progress, 0.25, 0.85, 255, 140, true);
    let charTintB = map(progress, 0.25, 0.85, 255, 90, true);
    tint(charTintR, charTintG, charTintB);

    image(personajeImg, charX, charY, min(width * 0.35, 410), min(height * 0.58, 570));
    pop();
  }

  if (elapsed > FLIGHT_START && progress < 0.50 && !explosionTriggered) {
    drawSeagulls();
  }

  if (elapsed > 2000 && !lightningTriggered) {
    triggerLightning();
    lightningTriggered = true;
    if (thunderEnv) thunderEnv.play();
  }
  updateAndDrawLightning();

  if (elapsed > FLIGHT_START && progress < 0.88) {
    let wingAlpha = map(elapsed, FLIGHT_START, FLIGHT_START + 1200, 0, 255, true);
    if (wingAlpha > 10 && personajeImg && personajeImg.width > 0) {
      drawInteractiveWings(width / 2, height * 0.82 - 35, visualWingAnim);
    }
  }

  if (progress >= 0.82 && progress < 1.0 && !explosionTriggered) {
    releaseFastBurnFeathers();
  }

  updateFloatingLeaves();

  // 3. Cintas orgánicas laterales y franja negra INFERIOR 100% OPACA (90px)
  drawSolidBlackRibbonsAndBottomBar();

  // 4. Plumas cayendo
  updateFeathersOnTop();

  // 5. Carteles posteriores y epílogo
  drawPromptMessage(elapsed);
  drawWarningBanner(); 
  drawInactivityWarning(); 

  if (progress >= 0.88) {
    triggerAndDropExplosion();
  }
}

function drawStartScreen() {
  push();
  background(10, 15, 25);
  
  push();
  tint(100, 120, 150, 100);
  imageMode(CENTER);
  if (nubeImg && nubeImg.width > 0) {
    image(nubeImg, width / 2, height * 0.4, min(width * 0.8, 1000), min(height * 0.5, 500));
  }
  pop();

  drawCaesarText("DALE LAS ÚLTIMAS PUNTADAS", width / 2, height * 0.10, min(width * 0.038, 34), 1000);
  drawCaesarText("A TUS ALAS PARA COMENZAR", width / 2, height * 0.16, min(width * 0.038, 34), 1000);

  let novilloX = width / 2;
  let novilloY = height * 0.36; 
  let hover = dist(mouseX, mouseY, novilloX, novilloY) < 100;

  push();
  noStroke();
  for (let s of novilloSparkles) {
    s.angle += s.speed;
    let sx = novilloX + cos(s.angle) * s.distRadius;
    let sy = novilloY + sin(s.angle * 1.5) * (s.distRadius * 0.75);
    let sAlpha = map(sin(millis() * 0.01 + s.alphaOffset), -1, 1, 100, 255);
    
    fill(255, 235, 160, sAlpha);
    ellipse(sx, sy, s.size, s.size);
    fill(255, 255, 255, sAlpha * 0.9);
    ellipse(sx, sy, s.size * 0.4, s.size * 1.6);
    ellipse(sx, sy, s.size * 1.6, s.size * 0.4);
  }
  pop();

  push();
  imageMode(CENTER);
  translate(novilloX, novilloY);
  
  let nWidth = hover ? min(width * 0.17, 200) : min(width * 0.14, 165);
  let aspect = novilloImg && novilloImg.width > 0 ? (novilloImg.height / novilloImg.width) : 1;

  if (novilloImg && novilloImg.width > 0) {
    tint(255, 255, 255, 250);
    image(novilloImg, 0, 0, nWidth, nWidth * aspect);
  }
  pop();

  let alphaPulse = map(sin(millis() * 0.006), -1, 1, 150, 255);
  push();
  let ctx = drawingContext;
  ctx.save();
  let bigTextSize = min(width * 0.045, 42); 
  ctx.font = "italic " + bigTextSize + "px 'Caesar Dressing', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  ctx.lineWidth = bigTextSize * 0.12;
  ctx.strokeStyle = "rgba(10, 10, 10, 0.95)";
  ctx.strokeText("Presiona el novillo", width / 2, height * 0.60);
  
  ctx.fillStyle = `rgba(255, 240, 200, ${alphaPulse / 255})`;
  ctx.fillText("Presiona el novillo", width / 2, height * 0.60);
  ctx.restore();
  pop();
}

function drawCaesarText(txt, x, y, size, elapsed) {
  let alphaIn = constrain(map(elapsed, 0, 800, 0, 1), 0, 1);
  let alphaOut = constrain(map(elapsed, STORY_DURATION - 800, STORY_DURATION, 1, 0), 0, 1);
  let finalAlpha = alphaIn * alphaOut;

  let ctx = drawingContext;
  ctx.save();
  ctx.font = size + "px 'Caesar Dressing', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = finalAlpha;

  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = "rgba(10, 10, 10, 0.95)";
  ctx.strokeText(txt, x, y);

  ctx.fillStyle = "rgb(255, 245, 220)";
  ctx.fillText(txt, x, y);
  ctx.restore();
}

function drawCenteredSingleCloud(elapsed) {
  let cloudTint;

  if (elapsed < FLIGHT_START) {
    cloudTint = color(190, 205, 220);
  } else if (!explosionTriggered) {
    if (progress < 0.25) {
      let t = map(progress, 0, 0.25, 0, 1);
      cloudTint = lerpColor(color(220, 235, 255), color(255, 245, 190), t);
    } else if (progress >= 0.25 && progress < 0.32) {
      let flashYellow = sin(millis() * 0.025) * 40;
      cloudTint = color(255, 240 + flashYellow, 120);
    } else if (progress < 0.7) {
      let t = map(progress, 0.32, 0.7, 0, 1);
      cloudTint = lerpColor(color(255, 220, 100), color(255, 120, 30), t);
    } else {
      let pulse = sin(millis() * 0.015) * 35;
      cloudTint = color(255 + pulse, 60 + max(pulse, 0), 10);
    }
  } else {
    let pulse = sin(millis() * 0.02) * 40;
    cloudTint = color(255 + pulse, 40 + max(pulse, 0), 10);
  }

  push();
  let cx = width / 2;
  let cy = height * 0.46; 
  let cW = min(width * 0.65, 900);
  let cH = min(height * 0.58, 560);

  if (nubeImg && nubeImg.width > 0) {
    imageMode(CENTER);
    tint(red(cloudTint), green(cloudTint), blue(cloudTint), 245);
    image(nubeImg, cx, cy, cW, cH);
  }

  if (leavesImg && leavesImg.width > 0) {
    let leafAlpha = map(elapsed, 0, STORY_DURATION, 200, 0, true);
    if (elapsed < STORY_DURATION) {
      tint(255, 255, 255, leafAlpha);
      imageMode(CENTER);
      image(leavesImg, cx - cW * 0.38, cy + 20, 70, 70 * (leavesImg.height / leavesImg.width));
      image(leavesImg, cx + cW * 0.38, cy + 20, 70, 70 * (leavesImg.height / leavesImg.width));
    }
  }

  pop();
}

function drawTopExtraCloud(elapsed) {
  let cloudTint;
  if ((!explosionTriggered && progress >= 0.25) || explosionTriggered) {
    let pulse = sin(millis() * 0.02) * 30;
    cloudTint = color(255, 220 + pulse, 100, 220);
    if (progress >= 0.32 || explosionTriggered) {
      cloudTint = color(255 + pulse, 90, 15, 220);
    }
  } else {
    cloudTint = color(210, 225, 240, 200);
  }

  push();
  let cx = width / 2;
  let cy = height * 0.18; 
  let cW = min(width * 0.65, 850);
  let cH = min(height * 0.35, 320);

  if (nubeImg && nubeImg.width > 0) {
    imageMode(CENTER);
    tint(red(cloudTint), green(cloudTint), blue(cloudTint), 210);
    image(nubeImg, cx, cy, cW, cH);
  }
  pop();
}

function drawLeftCloud(elapsed) {
  let cloudTint;
  if ((!explosionTriggered && progress >= 0.25) || explosionTriggered) {
    let pulse = sin(millis() * 0.018 + 1) * 30;
    cloudTint = color(255, 210 + pulse, 90, 220);
    if (progress >= 0.32 || explosionTriggered) {
      cloudTint = color(255 + pulse, 80, 10, 220);
    }
  } else {
    cloudTint = color(200, 215, 230, 200);
  }

  push();
  let cx = width * 0.50; 
  let cy = height * 0.32; 
  let cW = min(width * 0.50, 650);
  let cH = min(height * 0.30, 280);

  if (nubeImg && nubeImg.width > 0) {
    imageMode(CENTER);
    tint(red(cloudTint), green(cloudTint), blue(cloudTint), 210);
    image(nubeImg, cx, cy, cW, cH);
  }
  pop();
}

function updateFloatingLeaves() {
  if (!leavesImg || leavesImg.width === 0) return;
  push();
  imageMode(CENTER);
  for (let i = floatingLeaves.length - 1; i >= 0; i--) {
    let lf = floatingLeaves[i];
    lf.x += lf.vx;
    lf.y += (lf.vy * 1.5);
    lf.rotation += lf.rotSpeed;
    lf.alpha -= 2.2; 

    tint(255, 255, 255, max(lf.alpha, 0));
    push();
    translate(lf.x, lf.y);
    rotate(lf.rotation);
    let aspect = leavesImg.height / leavesImg.width;
    image(leavesImg, 0, 0, lf.size, lf.size * aspect);
    pop();

    if (lf.alpha <= 0 || lf.y < -100 || lf.x < -100 || lf.x > width + 100) {
      floatingLeaves.splice(i, 1);
    }
  }
  pop();
}

function drawAscendingBackgroundClouds(elapsed) {
  let bgCloudTint;

  if (elapsed < FLIGHT_START) {
    bgCloudTint = color(200, 215, 230);
  } else if (!explosionTriggered) {
    if (progress < 0.25) {
      let t = map(progress, 0, 0.25, 0, 1);
      bgCloudTint = lerpColor(color(200, 215, 230), color(255, 230, 170), t);
    } else if (progress < 0.32) {
      bgCloudTint = color(255, 240, 140);
    } else if (progress < 0.70) {
      let t = map(progress, 0.32, 0.70, 0, 1);
      bgCloudTint = lerpColor(color(255, 200, 100), color(245, 140, 90), t);
    } else {
      let t = map(progress, 0.70, 1.0, 0, 1);
      bgCloudTint = lerpColor(color(245, 140, 90), color(230, 40, 10), t);
    }
  } else {
    bgCloudTint = color(220, 50, 20);
  }

  let burnScaleFactor = 1.0;
  if (!explosionTriggered && progress >= 0.68) {
    burnScaleFactor = map(progress, 0.68, 1.0, 1.0, 2.6, true);
  } else if (explosionTriggered) {
    burnScaleFactor = 2.6;
  }

  let speedMultiplier = map(progress, 0, 1, 1.0, 5.5, true);
  
  if (!explosionTriggered && progress >= 0.10 && progress < 0.30) {
    speedMultiplier = 3.5;
  }

  let sizeMultiplier = 1.0;
  if (!explosionTriggered && progress >= 0.32 && progress < 0.52) {
    speedMultiplier = 4.2;
    sizeMultiplier = 1.4;
  } else if (!explosionTriggered && progress >= 0.54 && progress < 0.72) {
    speedMultiplier = 5.0;
    sizeMultiplier = 1.5;
  }

  if (noFlapTimer > 1800 && elapsed > FLIGHT_START && !explosionTriggered) {
    speedMultiplier = 0;
  }

  push();
  imageMode(CENTER);
  for (let bc of bgClouds) {
    let baseDrift = 1.2 * speedMultiplier;
    let speedBonus = (wingOpenness > 0.15) ? map(wingOpenness, 0.15, 1.0, 0.5, 4.0, true) * speedMultiplier : 0;
    
    bc.y += (bc.speedY * speedMultiplier + baseDrift + speedBonus);

    let currentW = bc.sizeW * burnScaleFactor * sizeMultiplier;
    let currentH = bc.sizeH * burnScaleFactor * sizeMultiplier;
    if (bc.y > height + currentH) {
      bc.y = -currentH;
      bc.x = random(width * 0.15, width * 0.85);
    }

    if (nubeImg && nubeImg.width > 0) {
      tint(red(bgCloudTint), green(bgCloudTint), blue(bgCloudTint), bc.alpha);
      image(nubeImg, bc.x, bc.y, currentW, currentH);
    }
  }
  pop();
}

function drawInteractiveWings(px, py, openness) {
  if (!alasCerradasImg || alasCerradasImg.width === 0 || !alasAbiertasImg || alasAbiertasImg.width === 0) return;

  push();
  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = 'high';

  let baseW = min(width * 0.42, 520);
  let currentW = lerp(baseW * 0.85, baseW * 1.35, openness);
  let closedH = currentW * (alasCerradasImg.height / alasCerradasImg.width);
  let openH = currentW * (alasAbiertasImg.height / alasAbiertasImg.width);
  let currentH = lerp(closedH, openH, openness);

  let verticalOffset = map(openness, 0, 1, 0, 25);
  translate(px, py - verticalOffset);

  imageMode(CENTER);

  let targetAlphaOpen = map(openness, 0.15, 0.45, 0, 255, true);
  alasAlpha = lerp(alasAlpha, targetAlphaOpen, 0.3); 

  let alphaCerradas = 255 - alasAlpha;
  let alphaAbiertas = alasAlpha;

  if (alphaCerradas > 2) {
    tint(255, 255, 255, alphaCerradas);
    image(alasCerradasImg, 0, 0, currentW, currentH);
  }

  if (alphaAbiertas > 2) {
    let finalOpenAlpha = map(alphaAbiertas, 0, 255, 100, 255);
    tint(255, 255, 255, finalOpenAlpha);
    image(alasAbiertasImg, 0, 0, currentW, currentH);
  }

  pop();
}

function drawInactivityWarning() {
  let elapsed = (millis() - totalPausedDuration) - startTime;
  if (elapsed > FLIGHT_START && !explosionTriggered && noFlapTimer > 1800) {
    drawCaesarText("¡ESTÁS", width / 2, height * 0.16, min(width * 0.08, 65), 500);
    drawCaesarText("DETENIDO!", width / 2, height * 0.36, min(width * 0.08, 65), 500);
  }
}

function drawSolidBlackRibbonsAndBottomBar() {
  push();
  noStroke();
  fill(0, 0, 0);

  let t = millis() * 0.0008;
  let barHeight = 90;

  beginShape();
  vertex(0, 0);
  vertex(width * 0.22, 0);
  for (let y = 0; y <= height - barHeight; y += 60) {
    let wave1 = sin(y * 0.008 + t) * 35;
    let x = width * 0.12 + wave1;
    vertex(x, y);
  }
  vertex(0, height - barHeight);
  endShape(CLOSE);

  beginShape();
  vertex(width, 0);
  vertex(width * 0.78, 0);
  for (let y = 0; y <= height - barHeight; y += 60) {
    let wave1 = sin(y * 0.008 - t * 1.2) * 35;
    let x = width * 0.88 - wave1;
    vertex(x, y);
  }
  vertex(width, height - barHeight);
  endShape(CLOSE);

  rect(0, height - barHeight, width, barHeight);
  pop();
}

function handleSequentialAudio(elapsed) {
  if (!playingAmbiente && sndAmbiente && sndAmbiente.isLoaded()) {
    if (!sndAmbiente.isPlaying()) {
      sndAmbiente.loop();
      sndAmbiente.setVolume(0.35);
    }
    playingAmbiente = true;
  }

  if (elapsed >= FLIGHT_START && !playingAleteo && progress < 0.68 && !aleteoFaded) {
    if (sndAleteo && sndAleteo.isLoaded() && !sndAleteo.isPlaying()) {
      sndAleteo.loop();
      sndAleteo.setVolume(0.35);
      playingAleteo = true;
    }
  }

  if (progress >= 0.38 && !playingViento && progress < 0.88) {
    if (sndViento && sndViento.isLoaded() && !sndViento.isPlaying()) {
      sndViento.loop();
      sndViento.setVolume(0.4);
      playingViento = true;
    }
  }

  if (progress >= 0.68 && progress < 0.88) {
    if (!aleteoFaded) {
      playingAleteo = false; 
      if (sndAleteo && sndAleteo.isPlaying()) {
        sndAleteo.setVolume(0, 1.5);
      }
      aleteoFaded = true;
    }

    if (!playingFuego) {
      if (sndFuego && sndFuego.isLoaded() && !sndFuego.isPlaying()) {
        sndFuego.loop();
        sndFuego.setVolume(0);
        sndFuego.setVolume(0.8, 2.0);
      }
      playingFuego = true;
    }

    if (!playingFuego2) {
      if (sndFuego2 && sndFuego2.isLoaded() && !sndFuego2.isPlaying()) {
        sndFuego2.loop();
        sndFuego2.setVolume(0);
        sndFuego2.setVolume(0.7, 2.0);
      }
      playingFuego2 = true;
    }
  }

  if (progress >= 0.88 && !audioEndingFaded) {
    if (sndViento && sndViento.isPlaying()) sndViento.setVolume(0, 2.0);
    if (sndFuego && sndFuego.isPlaying()) sndFuego.setVolume(0, 2.0);
    if (sndFuego2 && sndFuego2.isPlaying()) sndFuego2.setVolume(0, 2.0);
    
    if (sndFinal && sndFinal.isLoaded() && !playingFinal) {
      sndFinal.play();
      sndFinal.setVolume(0.8);
      playingFinal = true;
    }

    audioEndingFaded = true;
  }
}

function startCameraTracking() {
  if (cameraStarted) return;
  cameraStarted = true;

  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  pose.setOptions({
    modelComplexity: 0, 
    smoothLandmarks: true,
    minDetectionConfidence: 0.35,
    minTrackingConfidence: 0.35
  });

  pose.onResults(gotPose);

  cameraInstance = new Camera(video.elt, {
    onFrame: async () => {
      if (pose && video && video.elt && !cameraShutDown && !isPaused) {
        try {
          await pose.send({ image: video.elt });
        } catch(e) {}
      }
    },
    width: 320,
    height: 240
  });

  cameraInstance.start().catch((err) => console.error("Error cámara:", err));
}

function stopCameraTracking() {
  if (cameraShutDown) return;
  cameraShutDown = true;
  try {
    if (cameraInstance && cameraInstance.stop) {
      cameraInstance.stop();
    }
    if (video && video.elt && video.elt.srcObject) {
      let tracks = video.elt.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  } catch(e) {}
  poses = [];
}

function gotPose(results) {
  if (!cameraShutDown && !isPaused) {
    poses = results.poseLandmarks || [];
  }
}

function drawPauseOverlay() {
  push();
  fill(0, 0, 0, 130);
  rect(0, 0, width, height);
  drawCaesarText("PAUSA", width / 2, height / 2 - 25, min(width * 0.12, 95), 500);

  let ctx = drawingContext;
  ctx.save();
  ctx.font = "italic 28px 'Caesar Dressing', serif";
  ctx.fillStyle = "rgba(230, 235, 245, 230)";
  ctx.textAlign = "center";
  ctx.fillText("Haz clic para continuar", width / 2, height / 2 + 55);
  ctx.restore();
  pop();
}

function drawPromptMessage(elapsed) {
  if (elapsed >= STORY_DURATION && elapsed < FLIGHT_START) {
    let a = constrain(map(elapsed, STORY_DURATION, STORY_DURATION + 600, 0, 1) * map(elapsed, FLIGHT_START - 600, FLIGHT_START, 1, 0), 0, 1);
    drawCaesarText("ES HORA", width / 2, height * 0.16, min(width * 0.09, 78), a * 1000);
    drawCaesarText("DE VOLAR!", width / 2, height * 0.36, min(width * 0.09, 78), a * 1000);
  }
}

function drawWarningBanner() {
  if (progress >= 0.10 && progress < 0.30) {
    let a = constrain(map(progress, 0.10, 0.15, 0, 1) * map(progress, 0.25, 0.30, 1, 0), 0, 1);
    drawCaesarText("VUELA MÁS", width / 2, height * 0.14, min(width * 0.085, 72), a * 1000);
    drawCaesarText("FUERTE!", width / 2, height * 0.34, min(width * 0.085, 72), a * 1000);
  } else if (progress >= 0.32 && progress < 0.52) {
    let a = constrain(map(progress, 0.32, 0.37, 0, 1) * map(progress, 0.47, 0.52, 1, 0), 0, 1);
    drawCaesarText("DATE", width / 2, height * 0.16, min(width * 0.09, 78), a * 1000);
    drawCaesarText("PRISA!", width / 2, height * 0.36, min(width * 0.09, 78), a * 1000);
  } else if (progress >= 0.54 && progress < 0.72) {
    let a = constrain(map(progress, 0.54, 0.59, 0, 1) * map(progress, 0.67, 0.72, 1, 0), 0, 1);
    drawCaesarText("¿SEGURO DE SEGUIR", width / 2, height * 0.20, min(width * 0.065, 54), a * 1000);
    drawCaesarText("ALETEANDO?", width / 2, height * 0.36, min(width * 0.065, 54), a * 1000);
  } else if (progress >= 0.74 && progress < 0.86) {
    let a = constrain(map(progress, 0.74, 0.79, 0, 1) * map(progress, 0.81, 0.86, 1, 0), 0, 1);
    drawCaesarText("¡LA CERA SE", width / 2, height * 0.18, min(width * 0.08, 68), a * 1000);
    drawCaesarText("DERRITE!", width / 2, height * 0.38, min(width * 0.08, 68), a * 1000);
  }
}

function triggerAndDropExplosion() {
  if (!explosionTriggered) {
    explosionTriggered = true;
    explosionFlash = 255;
    epilogueStartTime = millis();
    feathers = [];
  }

  let epilogueElapsed = millis() - epilogueStartTime;

  // --- DISPARO AUTOMÁTICO A RESOLUME VÍA PUENTE OSC (LOCAL) ---
  if (!resolumeSenalEnviada) {
    resolumeSenalEnviada = true;
    enviarSenalAResolume(); 
    
    // Recarga la página web a los 6 segundos para reiniciar la experiencia de la muestra
    setTimeout(() => {
      window.location.reload(); 
    }, 6000);
  }

  let maxFeathers = (epilogueElapsed >= 14000 && epilogueElapsed < 22500) ? 60 : 15;
  let spawnChance = (epilogueElapsed >= 14000 && epilogueElapsed < 22500) ? 0.95 : 0.15;

  if (epilogueElapsed < 26500 && random() < spawnChance && feathers.length < maxFeathers) {
    feathers.push({
      x: width * 0.5 + random(-width * 0.48, width * 0.48),
      y: -30,
      vx: random(-3.0, 3.0),
      vy: (epilogueElapsed >= 14000 && epilogueElapsed < 22500) ? random(12, 22) : random(5.5, 11.0),
      gravity: 0.16,
      swayFreq: 0.05,
      swayAmp: 2.8,
      phase: random(TWO_PI),
      rotation: random(TWO_PI),
      rotationSpeed: random(-0.05, 0.05),
      size: random(85, 135),
      flipX: random() < 0.5 ? 1 : -1,
      flipY: random() < 0.5 ? 1 : -1,
      alpha: 255,
      alphaSpeed: 1.1
    });
  }

  if (explosionFlash > 0) {
    push();
    fill(255, 255, 255, explosionFlash);
    rect(0, 0, width, height);
    pop();
    explosionFlash = lerp(explosionFlash, 0, 0.09);
  }

  if (icaroCayendoImg && icaroCayendoImg.width > 0 && epilogueElapsed < 12000) {
    push();
    imageMode(CENTER);
    
    let fallX = map(epilogueElapsed, 0, 4500, width * 0.78, width * 0.22, true); 
    let fallY = map(epilogueElapsed, 0, 4500, height * 0.12, height + 250, true); 
    let fallRot = map(epilogueElapsed, 0, 4500, 0.2, 1.1, true);
    
    translate(fallX, fallY);
    rotate(fallRot);
    
    let icaroAlpha = map(epilogueElapsed, 2800, 4500, 255, 0, true);
    tint(255, 255, 255, icaroAlpha);

    image(icaroCayendoImg, 0, 0, min(width * 0.35, 420), min(height * 0.58, 580));
    pop();
  }

  if (epilogueElapsed < 23000) {
    drawBurningFeatherDecor(width * 0.22, height * 0.65, 1, 200);
    drawBurningFeatherDecor(width * 0.78, height * 0.65, -1, 200);
  }

  if (epilogueElapsed >= 500 && epilogueElapsed < 8200) {
    let a = constrain(map(epilogueElapsed, 500, 1500, 0, 1) * map(epilogueElapsed, 7200, 8200, 1, 0), 0, 1);
    
    drawCaesarText("EL SOL CALCINÓ", width / 2, height * 0.18, min(width * 0.085, 74), a * 1000);
    drawCaesarText("LAS ALAS DE ÍCARO", width / 2, height * 0.38, min(width * 0.075, 65), a * 1000);
  }

  if (epilogueElapsed >= 14000 && epilogueElapsed < 22000) {
    let a = constrain(map(epilogueElapsed, 14000, 15200, 0, 1) * map(epilogueElapsed, 20800, 22000, 1, 0), 0, 1);
    
    drawCaesarText("DEJA TUS ALAS,", width / 2, height * 0.12, min(width * 0.055, 48), a * 1000);
    drawCaesarText("ES HORA DE DESCANSAR...", width / 2, height * 0.28, min(width * 0.045, 40), a * 1000);
  }

  if (epilogueElapsed >= 26000) {
    let a = constrain(map(epilogueElapsed, 26000, 28000, 0, 1), 0, 1);
    drawBurningFeatherDecor(width * 0.22, height * 0.65, 1, a * 255);
    drawBurningFeatherDecor(width * 0.78, height * 0.65, -1, a * 255);
    
    drawCaesarText("EL MITO", width / 2, height * 0.16, min(width * 0.11, 95), a * 1000);
    drawCaesarText("DE ÍCARO Y DÉDALO", width / 2, height * 0.33, min(width * 0.055, 48), a * 1000);
    
    drawInvertedArchFeathers(width / 2, height * 0.44, a * 255);
  }
}

// =========================================================
// FUNCIÓN PARA COMUNICARSE CON EL PUENTE OSC DE RESOLUME
// =========================================================
function enviarSenalAResolume() {
  fetch('http://localhost:8080/disparar-mapping', {
    method: 'POST'
  }).catch(err => console.log("Servidor local apagado o inaccesible", err));
}

function drawInvertedArchFeathers(centerX, centerY, alphaVal) {
  if (!featherImg || featherImg.width === 0) return;
  push();
  imageMode(CENTER);
  
  let pWidth = min(width * 0.08, 90);
  let pHeight = pWidth * (featherImg.height / featherImg.width);
  let spacing = pWidth * 0.85;

  let offsets = [
    { x: -spacing, y: 12, rot: -0.45 },
    { x: 0,        y: 0,  rot: 0.0 },
    { x: spacing,  y: 12, rot: 0.45 }
  ];

  for (let f of offsets) {
    push();
    translate(centerX + f.x, centerY + f.y);
    rotate(f.rot);
    
    tint(255, 230, 180, alphaVal * 0.85);
    image(featherImg, 0, 0, pWidth * 1.05, pHeight * 1.05);
    
    tint(255, 255, 255, alphaVal);
    image(featherImg, 0, 0, pWidth, pHeight);
    pop();
  }
  pop();
}

function triggerAndDrawExplosion() {
  triggerAndDropExplosion();
}

function drawAtmosphere(elapsed) {
  let epilogueElapsed = explosionTriggered ? (millis() - epilogueStartTime) : 0;
  
  if (explosionTriggered && epilogueElapsed >= 23500) {
    background(0);
    return;
  }

  let cTop, cBottom;

  if (elapsed < FLIGHT_START) {
    let t = map(elapsed, 0, FLIGHT_START, 0, 1);
    cTop = lerpColor(color(5, 8, 14), color(15, 75, 160), t);
    cBottom = lerpColor(color(12, 18, 28), color(100, 195, 255), t);
  } else if (!explosionTriggered) {
    if (progress < 0.25) {
      let t = map(progress, 0, 0.25, 0, 1);
      let waveBlue = sin(millis() * 0.003) * 15;
      cTop = lerpColor(color(15, 75, 160), color(40, 130, 210), t);
      cBottom = lerpColor(color(100, 195 + waveBlue, 255), color(180, 220, 240), t);
    } else if (progress < 0.32) {
      cTop = color(220, 100, 20);
      cBottom = color(255, 220, 80);
    } else if (progress < 0.52) {
      let t = map(progress, 0.32, 0.52, 0, 1);
      cTop = lerpColor(color(220, 100, 20), color(225, 140, 30), t);
      cBottom = lerpColor(color(255, 220, 80), color(255, 210, 80), t);
    } else if (progress < 0.75) {
      let t = map(progress, 0.52, 0.75, 0, 1);
      cTop = lerpColor(color(225, 140, 30), color(145, 30, 25), t);
      cBottom = lerpColor(color(255, 210, 80), color(245, 110, 30), t);
    } else {
      let t = map(progress, 0.75, 1.0, 0, 1);
      cTop = lerpColor(color(145, 30, 25), color(215, 10, 5), t);
      cBottom = lerpColor(color(245, 110, 30), color(255, 45, 10), t);
    }
  } else {
    cTop = color(215, 10, 5);
    cBottom = color(255, 45, 10);
  }

  let ctx = drawingContext;
  let gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, cTop.toString());
  gradient.addColorStop(1, cBottom.toString());
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawBurningFeatherDecor(x, y, scaleX, alphaVal) {
  if (!featherImg || featherImg.width === 0) return;

  push();
  translate(x, y);
  scale(scaleX, 1);
  rotate(0.35 + sin(millis() * 0.004) * 0.05);
  imageMode(CENTER);

  let pWidth = min(width * 0.16, 180);
  let pHeight = pWidth * (featherImg.height / featherImg.width);

  tint(255, 60, 10, alphaVal * 0.85);
  image(featherImg, 0, 0, pWidth * 1.05, pHeight * 1.05);

  tint(255, 200, 70, alphaVal);
  image(featherImg, 0, 0, pWidth, pHeight);

  pop();
}

function drawSeagulls() {
  push();
  noFill();
  stroke(245, 250, 255, map(progress, 0.35, 0.50, 210, 0, true));
  strokeWeight(2.2);

  for (let g of seagulls) {
    g.x += g.vx;
    g.wingAngle += g.wingSpeed;

    if (g.x > width + 60) {
      g.x = -60;
      g.y = random(height * 0.2, height * 0.65);
      g.vx = random(3.5, 5.5);
    }

    let flapY = sin(g.wingAngle) * (g.size * 0.45);

    push();
    translate(g.x, g.y);
    beginShape();
    vertex(-g.size, flapY);
    quadraticVertex(-g.size * 0.45, -flapY * 0.5, 0, 0);
    quadraticVertex(g.size * 0.45, -flapY * 0.5, g.size, flapY);
    endShape();
    pop();
  }
  pop();
}

function releaseFastBurnFeathers() {
  if (random() < 0.15 && feathers.length < 12) {
    feathers.push({
      x: width * 0.5 + random(-width * 0.45, width * 0.45),
      y: -30,
      vx: random(-3.5, 3.5),
      vy: random(9.5, 17.5),
      gravity: 0.42,
      swayFreq: 0.08,
      swayAmp: 3.5,
      phase: random(TWO_PI),
      rotation: random(TWO_PI),
      rotationSpeed: random(-0.08, 0.08),
      size: random(85, 135),
      flipX: random() < 0.5 ? 1 : -1,
      flipY: random() < 0.5 ? 1 : -1,
      alpha: 255,
      alphaSpeed: 1.8
    });
  }
}

function updateFeathersOnTop() {
  let barHeight = 90;
  for (let i = feathers.length - 1; i >= 0; i--) {
    let f = feathers[i];

    f.vy += f.gravity;
    f.phase += f.swayFreq;
    let swayX = sin(f.phase) * f.swayAmp;

    f.x += f.vx + swayX;
    f.y += f.vy;

    f.rotation += f.rotationSpeed;
    f.alpha -= f.alphaSpeed;

    drawFallingFeather(f);

    if (f.y > height - barHeight || f.alpha <= 0) {
      f.y = height - barHeight;
      f.vy = 0;
      f.vx = 0;
      f.gravity = 0;
      f.swayAmp = 0;
      f.alpha -= 0.5;
    }
  }
}

function drawFallingFeather(f) {
  if (!featherImg || featherImg.width === 0) return;

  push();
  translate(f.x, f.y);
  rotate(f.rotation);
  scale(f.flipX, f.flipY);
  imageMode(CENTER);

  let aspect = featherImg.height / featherImg.width;

  tint(255, 75, 15, f.alpha);
  image(featherImg, 0, 0, f.size, f.size * aspect);
  tint(255, 210, 100, f.alpha * 0.85);
  image(featherImg, 0, 0, f.size * 0.7, f.size * 0.7 * aspect);

  pop();
}

function triggerLightning() {
  let startX = random(width * 0.25, width * 0.75);
  let mainBranches = [];
  let segments = floor(random(10, 14));
  let curX = startX;
  let curY = -10;
  let totalH = height * 0.8;
  let stepY = totalH / segments;

  let path = [{ x: curX, y: curY }];

  for (let i = 0; i < segments; i++) {
    curX += random(-40, 40);
    curY += stepY + random(-10, 15);
    path.push({ x: curX, y: curY });

    if (random() < 0.30 && i < segments - 2) {
      let subPath = [{ x: curX, y: curY }];
      let subX = curX;
      let subY = curY;
      for (let j = 0; j < 3; j++) {
        subX += random(15, 30) * (random() < 0.5 ? -1 : 1);
        subY += random(10, 25);
        subPath.push({ x: subX, y: subY });
      }
      mainBranches.push(subPath);
    }
  }

  currentLightning = {
    main: path,
    sub: mainBranches,
    life: 255
  };

  lightningFlash = 220;
}

function updateAndDrawLightning() {
  if (lightningFlash > 0) {
    push();
    noStroke();
    fill(210, 230, 255, lightningFlash * 0.55);
    rect(0, 0, width, height);
    pop();
    lightningFlash = lerp(lightningFlash, 0, 0.18);
  }

  if (currentLightning && currentLightning.life > 0) {
    push();
    stroke(255, 255, 255, currentLightning.life);
    strokeWeight(2.5);
    noFill();

    beginShape();
    for (let pt of currentLightning.main) vertex(pt.x, pt.y);
    endShape();

    strokeWeight(1.5);
    for (let branch of currentLightning.sub) {
      beginShape();
      for (let pt of branch) vertex(pt.x, pt.y);
      endShape();
    }
    pop();

    currentLightning.life -= 28;
    if (currentLightning.life <= 0) {
      currentLightning = null;
    }
  }
}

function getPoint(index) {
  if (!poses[index]) return null;
  return {
    x: width - poses[index].x * width,
    y: poses[index].y * height
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
