// ============================================================================
// Sketch Principal: El Mito de Ícaro y Dédalo (Con Destellos Amarillos y Tinte Rojizo)
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

// Variables de imágenes de alas
let featherImg = null;
let nubeImg = null;     
let leavesImg = null;
let personajeImg = null;
let alasCerradasImg = null; 
let alasAbiertasImg = null; 

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
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);

  startTime = millis();

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

  for (let i = 0; i < 7; i++) {
    bgClouds.push({
      x: random(width * 0.15, width * 0.85),
      y: random(-100, height + 100),
      speedY: random(1.8, 3.8),
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
      speed: random(6.0, 11.5),
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

  if (sndAmbiente && sndAmbiente.isLoaded() && !sndAmbiente.isPlaying()) {
    sndAmbiente.loop();
    sndAmbiente.setVolume(0.35);
    playingAmbiente = true;
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

        targetWing = map(wristsDist, shoulderDist * 0.80, shoulderDist * 2.2, 0, 1, true);
      }
    }

    wingOpenness = lerp(wingOpenness, targetWing, 0.15); 
    visualWingAnim = lerp(visualWingAnim, wingOpenness, 0.22); 
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

  drawAtmosphere(elapsed);
  drawAscendingBackgroundClouds(elapsed); 
  drawCenteredSingleCloud(elapsed);
  drawTopExtraCloud(elapsed); 
  drawLeftCloud(elapsed);     

  if (personajeImg && personajeImg.width > 0 && elapsed > FLIGHT_START && !explosionTriggered) {
    push();
    let charX = width / 2;
    let charY = height * 0.90;

    strokeWeight(2);
    let speedMultLines = (!explosionTriggered && progress >= 0.32 && progress < 0.52) ? 3.5 : 1.8;
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
    
    // ¡Tinte rojizo progresivo en el personaje según el calor/progreso!
    let charTintR = 255;
    let charTintG = map(progress, 0.25, 0.85, 255, 140, true);
    let charTintB = map(progress, 0.25, 0.85, 255, 90, true);
    tint(charTintR, charTintG, charTintB);

    image(personajeImg, charX, charY, min(width * 0.40, 480), min(height * 0.68, 680));
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
      drawInteractiveWings(width / 2, height * 0.90 - 40, visualWingAnim);
    }
  }

  if (progress >= 0.82 && progress < 1.0 && !explosionTriggered) {
    releaseFastBurnFeathers();
  }

  updateFeathers();
  updateFloatingLeaves();

  drawCinematicPrologue(elapsed);
  drawPromptMessage(elapsed);
  drawWarningBanner(); 
  drawInactivityWarning(); 

  if (progress >= 0.88) {
    triggerAndDrawExplosion();
  }

  drawOrganicOrganicRibbons();
}

// Nubes centrales con destello amarillo previo antes de prenderse fuego
function drawCenteredSingleCloud(elapsed) {
  let cloudTint;

  if (elapsed < FLIGHT_START) {
    cloudTint = color(190, 205, 220);
  } else if (!explosionTriggered) {
    if (progress < 0.25) {
      let t = map(progress, 0, 0.25, 0, 1);
      cloudTint = lerpColor(color(220, 235, 255), color(255, 245, 190), t);
    } else if (progress >= 0.25 && progress < 0.32) {
      // ¡Efectito especial de destello amarillo justo antes de DATE PRISA!
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
  let cy = height * 0.50; 
  let cW = min(width * 0.90, 1250);
  let cH = min(height * 0.58, 560);

  if (nubeImg && nubeImg.width > 0) {
    imageMode(CENTER);
    tint(red(cloudTint), green(cloudTint), blue(cloudTint), 245);
    image(nubeImg, cx, cy, cW, cH);
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
  let cy = height * 0.22; 
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
  let cy = height * 0.36; 
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
      bgCloudTint = color(255, 240, 140); // Destello amarillo previo
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

  let speedMultiplier = 2.2;
  let sizeMultiplier = 1.0;
  if (!explosionTriggered && progress >= 0.32 && progress < 0.52) {
    speedMultiplier = 3.8;
    sizeMultiplier = 1.4;
  } else if (!explosionTriggered && progress >= 0.54 && progress < 0.72) {
    speedMultiplier = 4.2;
    sizeMultiplier = 1.5;
  }

  if (noFlapTimer > 1800 && elapsed > FLIGHT_START && !explosionTriggered) {
    speedMultiplier = 0;
  }

  push();
  imageMode(CENTER);
  for (let bc of bgClouds) {
    let baseDrift = 1.5 * speedMultiplier;
    let speedBonus = (wingOpenness > 0.15) ? map(wingOpenness, 0.15, 1.0, 1.0, 3.5, true) * speedMultiplier : 0;
    
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

  let baseW = min(width * 0.62, 750);
  let currentW = lerp(baseW * 0.78, baseW * 1.22, openness);
  let closedH = currentW * (alasCerradasImg.height / alasCerradasImg.width);
  let openH = currentW * (alasAbiertasImg.height / alasAbiertasImg.width);
  let currentH = lerp(closedH, openH, openness);

  let verticalOffset = map(openness, 0, 1, 0, 25);
  translate(px, py - verticalOffset);

  imageMode(CENTER);

  let targetAlphaOpen = map(openness, 0.25, 0.55, 0, 255, true);
  alasAlpha = lerp(alasAlpha, targetAlphaOpen, 0.25); 

  let alphaCerradas = 255 - alasAlpha;
  let alphaAbiertas = alasAlpha;

  if (alphaCerradas > 2) {
    tint(255, 255, 255, alphaCerradas);
    image(alasCerradasImg, 0, 0, currentW, currentH);
  }

  if (alphaAbiertas > 2) {
    tint(255, 255, 255, alphaAbiertas);
    image(alasAbiertasImg, 0, 0, currentW, currentH);
  }

  pop();
}

function drawInactivityWarning() {
  let elapsed = (millis() - totalPausedDuration) - startTime;
  if (elapsed > FLIGHT_START && !explosionTriggered && noFlapTimer > 1800) {
    let yTop = height * 0.22;
    let xCenter = width * 0.50;
    let ySide = height * 0.36;
    let a = 230;

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');

    drawWavyBannerBg(width / 2, yTop, min(width * 0.45, 480), 95, a, color(255, 255, 255));
    textSize(min(width * 0.048, 44));
    fill(180, 20, 10, a);
    noStroke();
    text("¡ESTÁS", width / 2, yTop - 12);
    text("DETENIDO!", width / 2, yTop + 18);

    drawWavyBannerBg(xCenter, ySide, min(width * 0.45, 480), 95, a, color(255, 60, 40));
    textSize(min(width * 0.042, 38));
    fill(255, 255, 255, a);
    text("¡ALETEA!", xCenter, ySide);

    pop();
  }
}

function drawOrganicOrganicRibbons() {
  push();
  noStroke();
  fill(0, 0, 0, 220);

  let t = millis() * 0.0008;

  beginShape();
  vertex(0, 0);
  vertex(width * 0.22, 0);
  for (let y = 0; y <= height; y += 60) {
    let wave1 = sin(y * 0.008 + t) * 35;
    let x = width * 0.12 + wave1;
    vertex(x, y);
  }
  vertex(0, height);
  endShape(CLOSE);

  beginShape();
  vertex(width, 0);
  vertex(width * 0.78, 0);
  for (let y = 0; y <= height; y += 60) {
    let wave1 = sin(y * 0.008 - t * 1.2) * 35;
    let x = width * 0.88 - wave1;
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);
  pop();
}

function drawWavyBannerBg(xCenter, yCenter, wBox, hBox, alphaVal, customBgColor = null) {
  push();
  noStroke();
  let bgColor = customBgColor ? customBgColor : color(255, 255, 255);
  fill(red(bgColor), green(bgColor), blue(bgColor), alphaVal * 0.92);

  let t = millis() * 0.003; 
  let halfH = hBox / 2;
  let halfW = wBox / 2;

  beginShape();
  for (let currentX = xCenter - halfW; currentX <= xCenter + halfW; currentX += 15) {
    let waveY = yCenter - halfH + sin(currentX * 0.03 + t) * 8;
    vertex(currentX, waveY);
  }
  for (let y = yCenter - halfH; y <= yCenter + halfH; y += 15) {
    let waveX = xCenter + halfW + cos(y * 0.03 + t) * 8;
    vertex(waveX, y);
  }
  for (let currentX = xCenter + halfW; currentX >= xCenter - halfW; currentX -= 15) {
    let waveY = yCenter + halfH + sin(currentX * 0.03 - t) * 8;
    vertex(currentX, waveY);
  }
  for (let y = yCenter + halfH; y >= yCenter - halfH; y -= 15) {
    let waveX = xCenter - halfW + cos(y * 0.03 - t) * 8;
    vertex(waveX, y);
  }
  endShape(CLOSE);

  noFill();
  stroke(20, 20, 20, alphaVal * 0.75);
  strokeWeight(2);
  beginShape();
  for (let currentX = xCenter - halfW; currentX <= xCenter + halfW; currentX += 20) {
    vertex(currentX, yCenter - halfH + sin(currentX * 0.03 + t) * 8);
  }
  for (let currentX = xCenter + halfW; currentX >= xCenter - halfW; currentX -= 20) {
    vertex(currentX, yCenter + halfH + sin(currentX * 0.03 - t) * 8);
  }
  endShape();
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
  fill(0, 0, 0, 110);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textFont('Caesar Dressing', 'serif');
  textSize(min(width * 0.075, 62)); 
  fill(255, 235, 190);
  noStroke();

  text("PAUSA", width / 2, height / 2 - 15);

  textFont('Georgia', 'serif');
  textStyle(ITALIC);
  textSize(min(width * 0.026, 22)); 
  fill(230, 235, 245, 210);
  text("Haz clic para continuar", width / 2, height / 2 + 45);
  pop();
}

function drawCinematicPrologue(elapsed) {
  if (elapsed >= 0 && elapsed < STORY_DURATION) {
    let alphaIn = map(elapsed, 0, 800, 0, 255, true);
    let alphaOut = map(elapsed, STORY_DURATION - 800, STORY_DURATION, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    noStroke();
    fill(10, 10, 10, a);

    let yTop = height * 0.22;
    let xCenter = width * 0.50;
    let ySide = height * 0.36;
    let bannerW = min(width * 0.45, 480);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(255, 255, 255));
    textSize(min(width * 0.055, 50));
    text("EL MITO", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(255, 255, 255));
    textSize(min(width * 0.048, 42));
    text("DE ICARO Y DEDALO", xCenter, ySide);

    pop();
  }
}

function drawPromptMessage(elapsed) {
  if (elapsed >= STORY_DURATION && elapsed < FLIGHT_START) {
    let alphaIn = map(elapsed, STORY_DURATION, STORY_DURATION + 600, 0, 255, true);
    let alphaOut = map(elapsed, FLIGHT_START - 600, FLIGHT_START, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    noStroke();
    fill(10, 10, 10, a);

    let yTop = height * 0.22;
    let xCenter = width * 0.50;
    let ySide = height * 0.36;
    let bannerW = min(width * 0.45, 480);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(255, 255, 255));
    textSize(min(width * 0.055, 50));
    text("¡ES HORA", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(255, 255, 255));
    textSize(min(width * 0.045, 40));
    text("DE VOLAR!", xCenter, ySide);

    pop();
  }
}

function drawWarningBanner() {
  let yTop = height * 0.22;
  let xCenter = width * 0.50;
  let ySide = height * 0.36;
  let bannerW = min(width * 0.45, 480);

  if (progress >= 0.10 && progress < 0.30) {
    let alphaIn = map(progress, 0.10, 0.15, 0, 255, true);
    let alphaOut = map(progress, 0.25, 0.30, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    noStroke();
    fill(10, 10, 10, a);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(255, 255, 255));
    textSize(min(width * 0.052, 48));
    text("¡VUELA", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(255, 255, 255));
    textSize(min(width * 0.045, 40));
    text("MÁS FUERTE!", xCenter, ySide);
    pop();
  }

  if (progress >= 0.32 && progress < 0.52) {
    let alphaIn = map(progress, 0.32, 0.37, 0, 255, true);
    let alphaOut = map(progress, 0.47, 0.52, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    noStroke();
    fill(255, 255, 255, a);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(220, 40, 30));
    textSize(min(width * 0.055, 50));
    text("¡DATE", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(220, 40, 30));
    textSize(min(width * 0.050, 45));
    text("PRISA!", xCenter, ySide);
    pop();
  }

  if (progress >= 0.54 && progress < 0.72) {
    let alphaIn = map(progress, 0.54, 0.59, 0, 255, true);
    let alphaOut = map(progress, 0.67, 0.72, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    noStroke();
    fill(255, 255, 255, a);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(220, 40, 30));
    textSize(min(width * 0.045, 40));
    text("¿SEGURO", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(220, 40, 30));
    textSize(min(width * 0.042, 38));
    text("DE SEGUIR ALETEANDO?", xCenter, ySide);
    pop();
  }

  if (progress >= 0.74 && progress < 0.86) {
    let alphaIn = map(progress, 0.74, 0.79, 0, 255, true);
    let alphaOut = map(progress, 0.81, 0.86, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    noStroke();
    fill(255, 255, 255, a);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(220, 40, 30));
    textSize(min(width * 0.045, 40));
    text("¡LA CERA", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(220, 40, 30));
    text("SE DERRETE!", xCenter, ySide);
    pop();
  }
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
      // Destello cálido antes de DATE PRISA
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

function triggerAndDrawExplosion() {
  if (!explosionTriggered) {
    explosionTriggered = true;
    explosionFlash = 255;
    epilogueStartTime = millis();
    feathers = [];
  }

  let epilogueElapsed = millis() - epilogueStartTime;

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
      size: random(65, 105),
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

  let yTop = height * 0.22;
  let xCenter = width * 0.50;
  let ySide = height * 0.36;
  let bannerW = min(width * 0.45, 480);

  // ¡Plumitas decorativas acompañando a los textos del epílogo a los lados!
  if (epilogueElapsed < 23000) {
    drawBurningFeatherDecor(width * 0.22, height * 0.65, 1, 200);
    drawBurningFeatherDecor(width * 0.78, height * 0.65, -1, 200);
  }

  if (epilogueElapsed >= 500 && epilogueElapsed < 8200) {
    let alphaIn = map(epilogueElapsed, 500, 1500, 0, 255, true);
    let alphaOut = map(epilogueElapsed, 7200, 8200, 255, 0, true);
    let a = min(alphaIn, alphaOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    noStroke();
    fill(255, 255, 255, a);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(220, 40, 30));
    textSize(min(width * 0.045, 40));
    text("EL SOL", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(220, 40, 30));
    text("CALCINÓ LAS ALAS", xCenter, ySide);
    pop();
  }

  if (epilogueElapsed >= 14000 && epilogueElapsed < 22000) {
    let aIn = map(epilogueElapsed, 14000, 15200, 0, 255, true);
    let aOut = map(epilogueElapsed, 20800, 22000, 255, 0, true);
    let a = min(aIn, aOut);

    push();
    textAlign(CENTER, CENTER);
    textFont('Georgia', 'serif');
    textStyle(ITALIC);
    noStroke();
    fill(255, 255, 255, a);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(220, 40, 30));
    textSize(min(width * 0.035, 30));
    text("Deja tus alas,", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(220, 40, 30));
    text("es hora de descansar...", xCenter, ySide);
    pop();
  }

  // TÍTULO FINAL INCENDIADO CON SUS PLUMITAS A LOS LADOS
  if (epilogueElapsed >= 26000) {
    let a = map(epilogueElapsed, 26000, 28000, 0, 255, true);

    drawBurningFeatherDecor(width * 0.22, height * 0.65, 1, a);
    drawBurningFeatherDecor(width * 0.78, height * 0.65, -1, a);

    push();
    textAlign(CENTER, CENTER);
    textFont('Caesar Dressing', 'serif');
    noStroke();
    fill(255, 240, 150, a);

    drawWavyBannerBg(width / 2, yTop, bannerW, 95, a, color(235, 50, 10));
    textSize(min(width * 0.050, 45));
    text("EL MITO", width / 2, yTop);

    drawWavyBannerBg(xCenter, ySide, bannerW, 95, a, color(235, 50, 10));
    textSize(min(width * 0.040, 36));
    text("DE ÍCARO Y DÉDALO", xCenter, ySide);
    pop();
  }
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
      size: random(65, 110),
      flipX: random() < 0.5 ? 1 : -1,
      flipY: random() < 0.5 ? 1 : -1,
      alpha: 255,
      alphaSpeed: 1.8
    });
  }
}

function updateFeathers() {
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

    if (f.y > height + 80 || f.alpha <= 0) {
      feathers.splice(i, 1);
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
