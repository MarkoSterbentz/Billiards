var gl;
var canvas;

var shaderProgram;
var mvMatrix = mat4();
var mvMatrixStack = [];
var pMatrix = mat4();
var vertexColor;
var balls;

var cueShaderProgram;
var cueMVMatrix = mat4();

var lastTime = 0;
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;
        moveBalls();
        checkBallWallCollisions();
        checkBallBallCollisions();
        checkBallPocketCollisions();
    }
    lastTime = timeNow;
}

function moveBalls() {
    for (var i = 0; i < balls.length; i++) {
        moveBall(balls[i]);
    }
}

function moveBall(ball) {
    ball.mvMatrix = mult(ball.velocity, ball.mvMatrix);
    decelerate(ball);
}

function setVelocity(ball, newVelocity) {
    ball.velocity[0][3] = newVelocity[0];
    ball.velocity[1][3] = newVelocity[1];
    ball.velocity[2][3] = newVelocity[2];
}

function decelerate(ball) {
    var velocity = vec2();
    velocity[0] = ball.velocity[0][3];
    velocity[1] = ball.velocity[1][3];
    velocity = scale(0.98, velocity);
    if (length(velocity) < 0.00001) {
        velocity[0] = 0.0;
        velocity[1] = 0.0;
    }
    ball.velocity[0][3] = velocity[0];
    ball.velocity[1][3] = velocity[1];
}

function checkBallWallCollisions() {
    for (var i = 0; i < balls.length; i++) {
        if (balls[i].mvMatrix[0][3] < -9.0 + 2.0) {
            if (balls[i].velocity[0][3] < 0) {
                balls[i].velocity[0][3] *= -1.0;
                playWallHitSound();
            }
        }
        if (balls[i].mvMatrix[1][3] < -14.0 + 2.0) {
            if (balls[i].velocity[1][3] < 0) {
                balls[i].velocity[1][3] *= -1.0;
                playWallHitSound();
            }
        }
        if (balls[i].mvMatrix[0][3] > 9.0 - 2.0) {
            if (balls[i].velocity[0][3] > 0) {
                balls[i].velocity[0][3] *= -1.0;
                playWallHitSound();
            }
        }
        if (balls[i].mvMatrix[1][3] > 14.0 - 2.0) {
            if (balls[i].velocity[1][3] > 0) {
                balls[i].velocity[1][3] *= -1.0;
                playWallHitSound();
            }
        }
    }
}

function checkBallBallCollisions() {
    for (var i = 0; i < balls.length; i++) {
        for (var j = 0; j < balls.length; j++) {
            if (checkCollision(balls[i], balls[j]) && i != j) {
                handleCollision(balls[i], balls[j]);
                playBallHitSound();
            }
        }
    }
}

function checkCollision(ball1, ball2) {
    ball1Center = getBallCenter(ball1);
    ball2Center = getBallCenter(ball2);
    if (length(subtract(ball1Center, ball2Center)) < 2.0) {
        return true;
    } else {
        return false;
    }
}

function handleCollision(ball1, ball2) {
    /* This algorithm was adapted from the solution found here:
     * http://gamedev.stackexchange.com/questions/
     *               20516/ball-collisions-sticking-together
     */
    var ballOneV = getVelocityVec2(ball1);
    var ballTwoV = getVelocityVec2(ball2);
    var pos1 = getBallCenter(ball1);
    var pos2 = getBallCenter(ball2);

    var xDist = pos2[0] - pos1[0];
    var yDist = pos2[1] - pos1[1];

    var distSquared = xDist * xDist + yDist * yDist;

    if (distSquared <= 4) {
        var xVelocity = ballTwoV[0] - ballOneV[0];
        var yVelocity = ballTwoV[1] - ballOneV[1];

        var dotProduct = xDist * xVelocity + yDist * yVelocity;

        if (dotProduct < 0) {
            var collisionScale = dotProduct / distSquared;
            var xCollision = xDist * collisionScale;
            var yCollision = yDist * collisionScale;

            var combinedMass = 1.0 + 1.0;
            var collisionWeightA = 2 * 1.0 / combinedMass;
            var collisionWeightB = 2 * 1.0 / combinedMass;
            ball1.velocity[0][3] += collisionWeightA * xCollision;
            ball1.velocity[1][3] += collisionWeightA * yCollision;
            ball2.velocity[0][3] -= collisionWeightB * xCollision;
            ball2.velocity[1][3] -= collisionWeightB * yCollision;
        }
    }
}

function checkBallPocketCollisions() {
    for (var i = 0; i < balls.length; i++) {
        for (var j = 0; j < pockets.length; j++) {
            if (checkSingleBallPocketCollision(balls[i], pockets[j])) {
                handleBallPocketCollision(balls[i], i);
            }
        }
    }
}

function checkSingleBallPocketCollision(ball, pocket) {
    ballCenter = getBallCenter(ball);
    pocketCenter = getBallCenter(pocket);
    if (length(subtract(ballCenter, pocketCenter)) <
                             (1.1 * pocket.sMatrix[0][0])) {
        return true;
    } else {
        return false;
    }
}

function handleBallPocketCollision(ball, ballIndex) {
    ball.velocity = mat4();
    if (ballIndex == 0) {
        ball.mvMatrix = translate(0.0, -10.0, 0.0);
    } else {
        ball.mvMatrix = translate(ballIndex * 30.0, 30.0, 0.0);
    }
}

function getBallCenter(ball) {
    tempVec = vec2();
    tempVec[0] = ball.mvMatrix[0][3];
    tempVec[1] = ball.mvMatrix[1][3];
    return tempVec;
}

function getVelocityVec2(ball) {
    var tempVec = vec2();
    tempVec[0] = ball.velocity[0][3];
    tempVec[1] = ball.velocity[1][3];
    return tempVec;
}

function tick() {
    requestAnimFrame(tick);
    drawScene();
    animate();
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgram);
    pMatrix = ortho(-10.0, 10.0, -15.0, 15.0, 0.0, 15.0);

    for (var i = 0; i < balls.length; i++) {
        drawBall(i);
    }

    drawMetalEdges();
    drawPockets();
    drawWalls();

    gl.useProgram(cueShaderProgram);
    drawCue();
}

function drawBall(ballIndex) {
    mvPushMatrix(balls[ballIndex].mvMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                                ballVertexPositionBuffer.itemSize,
                                    gl.FLOAT, false, 0, 0);
    vertexColor = balls[ballIndex].color;
    gl.uniform4fv(shaderProgram.vertexColorUniform, vertexColor);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, gl.FALSE,
                                                        flatten(pMatrix));
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, gl.FALSE,
                                            flatten(balls[ballIndex].mvMatrix));
    gl.uniformMatrix4fv(shaderProgram.sMatrixUniform, gl.FALSE,
                                                flatten(mat4()));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, ballVertexPositionBuffer.numItems);
    balls[ballIndex].mvMatrix = mvPopMatrix();
}

function drawCue() {
    cueMVMatrix = mat4();
    cueMVMatrix = translate([0.0, 0.0, 0.0]);
    mvPushMatrix(cueMVMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, cueVertexPositionBuffer);
    gl.vertexAttribPointer(cueShaderProgram.vertexPositionAttribute,
                                cueVertexPositionBuffer.itemSize,
                                    gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(cueShaderProgram.cuePMatrixUniform, gl.FALSE,
                                                            flatten(pMatrix));
    gl.uniformMatrix4fv(cueShaderProgram.cueMVMatrixUniform,
                                                gl.FALSE, flatten(cueMVMatrix));
    gl.drawArrays(gl.LINES, 0, cueVertexPositionBuffer.numItems);
    cueMVMatrix = mvPopMatrix();
}

var woodSidings;
function drawWalls() {
    for (var i = 0; i < woodSidings.length; i++) {
        mvPushMatrix(woodSidings[i].mvMatrix);
        gl.bindBuffer(gl.ARRAY_BUFFER, woodVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                                    woodVertexPositionBuffer.itemSize,
                                        gl.FLOAT, false, 0, 0);
        vertexColor = woodSidings[i].color;
        gl.uniform4fv(shaderProgram.vertexColorUniform, vertexColor);
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, gl.FALSE,
                                                            flatten(pMatrix));
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, gl.FALSE,
                                            flatten(woodSidings[i].mvMatrix));
        gl.uniformMatrix4fv(shaderProgram.sMatrixUniform, gl.FALSE,
                                                flatten(mat4()));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, woodVertexPositionBuffer.numItems);
        woodSidings[i].mvMatrix = mvPopMatrix();
    }
}

var pockets;
function drawPockets() {
    for (var i = 0; i < pockets.length; i++) {
        mvPushMatrix(pockets[i].mvMatrix);
        gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                                    ballVertexPositionBuffer.itemSize,
                                        gl.FLOAT, false, 0, 0);
        vertexColor = pockets[i].color;
        gl.uniform4fv(shaderProgram.vertexColorUniform, vertexColor);
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, gl.FALSE,
                                                            flatten(pMatrix));
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, gl.FALSE,
                                                flatten(pockets[i].mvMatrix));
        gl.uniformMatrix4fv(shaderProgram.sMatrixUniform, gl.FALSE,
                                                flatten(pockets[i].sMatrix));
        gl.drawArrays(gl.TRIANGLE_FAN, 0, ballVertexPositionBuffer.numItems);
        pockets[i].mvMatrix = mvPopMatrix();
    }
}

var metalEdges;
function drawMetalEdges() {
    for (var i = 0; i < metalEdges.length; i++) {
        mvPushMatrix(metalEdges[i].mvMatrix);
        gl.bindBuffer(gl.ARRAY_BUFFER, metalEdgeVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                                    metalEdgeVertexPositionBuffer.itemSize,
                                        gl.FLOAT, false, 0, 0);
        vertexColor = metalEdges[i].color;
        gl.uniform4fv(shaderProgram.vertexColorUniform, vertexColor);
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, gl.FALSE,
                                                            flatten(pMatrix));
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, gl.FALSE,
                                            flatten(metalEdges[i].mvMatrix));
        gl.uniformMatrix4fv(shaderProgram.sMatrixUniform, gl.FALSE,
                                                flatten(mat4()));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0,
                            metalEdgeVertexPositionBuffer.numItems);
        metalEdges[i].mvMatrix = mvPopMatrix();
    }
}

function initTableComponents() {
    initTableWalls();
    initPockets();
    initMetalEdges();
}

function initTableWalls() {
    woodSidings = [];
    for (var i = 0; i < 4; i++) {
        var siding = {
                mvMatrix: mat4(),
                color: vec4(0.3333, 0.1111, 0.0, 1.0)
        };
        woodSidings.push(siding);
    }
    // left wall
    woodSidings[0].mvMatrix = rotateZ(-90);
    woodSidings[0].mvMatrix[0][3] = -10.0;
    woodSidings[0].mvMatrix[1][3] = -15.0;
    // bottom wall
    woodSidings[1].mvMatrix[0][3] = -10.0;
    woodSidings[1].mvMatrix[1][3] = -13.0;
    // right wall
    woodSidings[2].mvMatrix = rotateZ(-90);
    woodSidings[2].mvMatrix[0][3] = 8.0;
    woodSidings[2].mvMatrix[1][3] = -15.0;
    // top wall
    woodSidings[3].mvMatrix[0][3] = -10.0;
    woodSidings[3].mvMatrix[1][3] = 15.0;
}

function initMetalEdges() {
    metalEdges = [];
    for (var i = 0; i < 8; i++) {
        var metalEdge = {
                mvMatrix: mat4(),
                color: vec4(0.9, 0.9, 0.9, 1.0)
        };
        metalEdges.push(metalEdge);
    }
    // bottom left corner
    metalEdges[0].mvMatrix = rotateZ(-90);
    metalEdges[0].mvMatrix[0][3] = -10.0;
    metalEdges[0].mvMatrix[1][3] = -15.0;
    metalEdges[1].mvMatrix[0][3] = -10.0;
    metalEdges[1].mvMatrix[1][3] = -13.5;
    // top left corner
    metalEdges[2].mvMatrix = rotateZ(90);
    metalEdges[2].mvMatrix[0][3] = -8.5;
    metalEdges[2].mvMatrix[1][3] = 15.0;
    metalEdges[3].mvMatrix[0][3] = -10.0;
    metalEdges[3].mvMatrix[1][3] = 15.0;
    // top right corner
    metalEdges[4].mvMatrix = rotateZ(90);
    metalEdges[4].mvMatrix[0][3] = 10.0;
    metalEdges[4].mvMatrix[1][3] = 15.0;
    metalEdges[5].mvMatrix[0][3] = 6.0;
    metalEdges[5].mvMatrix[1][3] = 15.0;
    // bottom right corner
    metalEdges[6].mvMatrix = rotateZ(-90);
    metalEdges[6].mvMatrix[0][3] = 8.5;
    metalEdges[6].mvMatrix[1][3] = -15.0;
    metalEdges[7].mvMatrix[0][3] = 6.0;
    metalEdges[7].mvMatrix[1][3] = -13.5;
}

function initPockets() {
    pockets = [];
    for (var i = 0; i < 4; i++) {
        var pocket = {
            mvMatrix: mat4(),
            sMatrix: scalem(2.0, 2.0, 0.0),
            color: vec4(0.2, 0.2, 0.2, 1.0)
        };
        pockets.push(pocket);
    }
    pockets[0].mvMatrix = translate(-8.0, 13.0, 0.0); // top left
    pockets[1].mvMatrix = translate(8.0, 13.0, 0.0); // top right
    pockets[2].mvMatrix = translate(-8.0, -13.0, 0.0); // bottom left
    pockets[3].mvMatrix = translate(8.0, -13.0, 0.0); // bottom right
}

function initGL(canvas) {
    try {
            gl = canvas.getContext('experimental-webgl');
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
            alert('Could not initialise WebGL');
        }
    }

var ballVertexPositionBuffer;
var cueVertexPositionBuffer;
var woodVertexPositionBuffer;
var pocketVertexPositionBuffer;
var metalEdgeVertexPositionBuffer;
function initBuffers() {
    // balls and pockets
    var numTriangles = 360;
    ballVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexPositionBuffer);
    var vertices = generateBallVertices(numTriangles);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices),
                                                     gl.STATIC_DRAW);
    ballVertexPositionBuffer.itemSize = 3;
    ballVertexPositionBuffer.numItems = numTriangles;

    // cue
    cueVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cueVertexPositionBuffer);
    var cueVertices = [0.0, 0.0, 0.0, 1.0,
                       1.0, 1.0, 0.0, 1.0];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cueVertices),
                                                    gl.STATIC_DRAW);
    cueVertexPositionBuffer.itemSize = 4;
    cueVertexPositionBuffer.numItems = cueVertices.length / 4;

    // woodSidings
    woodVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, woodVertexPositionBuffer);
    var woodVertices = [0.0, 0.0, 0.0, 1.0,
                        30.0, 0.0, 0.0, 1.0,
                        0.0, -2.0, 0.0, 1.0,
                        30.0, -2.0, 0.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(woodVertices),
                                                    gl.STATIC_DRAW);
    woodVertexPositionBuffer.itemSize = 4;
    woodVertexPositionBuffer.numItems = 4;

    // metal edges
    metalEdgeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, metalEdgeVertexPositionBuffer);
    var metalEdgeVertices = [0.0, 0.0, 0.0, 1.0,
                             4.0, 0.0, 0.0, 1.0,
                             0.0, -1.5, 0.0, 1.0,
                             4.0, -1.5, 0.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(metalEdgeVertices),
                                                    gl.STATIC_DRAW);
    metalEdgeVertexPositionBuffer.itemSize = 4;
    metalEdgeVertexPositionBuffer.numItems = 4;
}

/**
Comment
*/
window.onload = function init() {
    canvas = document.getElementById('gl-canvas');
    initGL(canvas);

    shaderProgram = initShaders(gl, 'shader-vs', 'shader-fs');
    gl.useProgram(shaderProgram);
    shaderProgram.vertexPositionAttribute =
                    gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.pMatrixUniform =
                    gl.getUniformLocation(shaderProgram, 'uPMatrix');
    shaderProgram.mvMatrixUniform =
                    gl.getUniformLocation(shaderProgram, 'uMVMatrix');
    shaderProgram.sMatrixUniform =
                    gl.getUniformLocation(shaderProgram, 'uSMatrix');
    shaderProgram.vertexColorUniform =
                    gl.getUniformLocation(shaderProgram, 'uVertexColor');
    cueShaderProgram = initShaders(gl, 'cueshader-vs', 'cueshader-fs');
    gl.useProgram(cueShaderProgram);
    cueShaderProgram.vertexPositionAttribute =
                    gl.getAttribLocation(cueShaderProgram, 'aVertexPosition');
    cueShaderProgram.cuePMatrixUniform =
                    gl.getUniformLocation(cueShaderProgram, 'uCuePMatrix');
    cueShaderProgram.cueMVMatrixUniform =
                    gl.getUniformLocation(cueShaderProgram, 'uCueMVMatrix');
    cueShaderProgram.mouseUniform =
                    gl.getUniformLocation(cueShaderProgram, 'uMouse');
    cueShaderProgram.cueSMatrixUniform =
                    gl.getUniformLocation(cueShaderProgram, 'uCueSMatrix');

    initBuffers();

    gl.clearColor(0.03921, 0.86274, 0.43137, 1.0);
    gl.enable(gl.DEPTH_TEST);

    initBallObjects();
    arrangeBalls();

    initSoundEffects();

    initTableComponents();

    tick();

    // register event handlers
    canvas.addEventListener('mousedown', mouse_down, false);
    canvas.addEventListener('mousemove', mouse_move, false);
    canvas.addEventListener('mouseup', mouse_up, false);
};

var cueInitialX = 0;
var cueInitialY = 0;
var cueEndY = 0;
var cueEndX = 0;
var mouseDown = false;
var cueSMatrix = mat4();
function mouse_down(event) {
    mouseDown = true;
    cueInitialX = ((event.clientX - canvas.offsetLeft) / canvas.width) *
                                                            2.0 - 1.0;
    cueInitialY = -(((event.clientY - canvas.offsetTop) / canvas.height) *
                                                            2.0 - 1.0);
    gl.uniform2f(cueShaderProgram.mouseUniform, cueInitialX, cueInitialY);
    cueMVMatrix[0][3] = cueInitialX * 10;
    cueMVMatrix[1][3] = cueInitialY * 15;
    gl.uniformMatrix4fv(cueShaderProgram.cueMVMatrixUniform, gl.FALSE,
                                                    flatten(cueMVMatrix));
}
function mouse_move(event) {
    if (mouseDown) {
        cueEndX = ((event.clientX - canvas.offsetLeft) / canvas.width) *
                                                            2.0 - 1.0;
        cueEndY = -(((event.clientY - canvas.offsetTop) / canvas.height) *
                                                            2.0 - 1.0);
        cueSMatrix[0][0] = (cueEndX - cueInitialX) * 10;
        cueSMatrix[1][1] = (cueEndY - cueInitialY) * 15;
        gl.uniformMatrix4fv(cueShaderProgram.cueSMatrixUniform, gl.FALSE,
                                                        flatten(cueSMatrix));
    }
}

function mouse_up(event) {
    mouseDown = false;
    cueEndX = ((event.clientX - canvas.offsetLeft) / canvas.width) *
                                                            2.0 - 1.0;
    cueEndY = -(((event.clientY - canvas.offsetTop) / canvas.height) *
                                                            2.0 - 1.0);
    setVelocity(balls[0], vec3(cueInitialX - cueEndX,
                                     cueInitialY - cueEndY, 0.0));
    cueSMatrix[0][0] = 0.0;
    cueSMatrix[1][1] = 0.0;
    cueMVMatrix = mat4();
    gl.uniformMatrix4fv(cueShaderProgram.cueSMatrixUniform,
                                    gl.FALSE, flatten(cueSMatrix));
    gl.uniformMatrix4fv(cueShaderProgram.cueMVMatrixUniform,
                                    gl.FALSE, flatten(cueMVMatrix));
}

function mvPushMatrix(_mvMatrix) {
    var copy = mat4();
    copy = _mvMatrix;
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw 'Invalid popMatrix!';
    }
    return mvMatrixStack.pop();
}

function generateBallVertices(numTriangles) {
  var circleVerts = [0.0, 0.0, 0.0,
                     1.0, 0.0, 0.0];
  var degPerTriangle = radians(360.0 / numTriangles);
  for (var i = 0; i < numTriangles; i++) {
    var angle = degPerTriangle * (i + 5); // should be +1
    circleVerts.push(Math.cos(angle));
    circleVerts.push(Math.sin(angle));
    circleVerts.push(0.0);
  }
  return circleVerts;
}

function generateBallColor(numTriangles, color) {
  ballColor = [];
  for (var i = 0; i < numTriangles; i++) {
    ballColor.push(color[0], color[1], color[2], color[3]);
  }
  return ballColor;
}

var ballZTranslation;
function initBallObjects() {
    var numBalls = 9;
    var colors = initBallColors();
    balls = [];
    ballZTranslation = 0.0;
    for (var i = 0; i < numBalls; i++) {
        var tempBall = {
                mvMatrix: mat4(),
                color: colors[i],
                velocity: mat4()
        };
        balls.push(tempBall);
    }
}

function initBallColors() {
    var colors = [];
    colors.push([1.0, 1.0, 1.0, 1.0]); //white
    colors.push([1.0, 1.0, 0.0, 1.0]); //yellow
    colors.push([40.0 / 255.0, 15.0 / 255.0, 115.0 / 225.0, 1.0]); //dark blue
    colors.push([1.0, 0.0, 0.0, 1.0]); //red
    colors.push([100.0 / 255.0, 15.0 / 255.0, 115.0 / 225.0, 1.0]); //purple
    colors.push([1.0, 0.5, 0.0, 1.0]); //orange
    colors.push([25.0 / 255.0, 70.0 / 255.0, 0.0, 1.0]); //dark green
    colors.push([100.0 / 255.0, 0.0, 0.0, 1.0]); //dark red
    colors.push([0.0, 0.0, 0.0, 1.0]); //black
    return colors;
}

function arrangeBalls() {
    balls[0].mvMatrix = translate(0.0, -10.0, ballZTranslation);

    balls[1].mvMatrix = translate(0.0, 2.2, ballZTranslation);
    balls[2].mvMatrix = translate(-1.0, 4.0, ballZTranslation);
    balls[3].mvMatrix = translate(1.0, 4.0, ballZTranslation);
    balls[4].mvMatrix = translate(-1.0, 6.0, ballZTranslation);
    balls[5].mvMatrix = translate(1.0, 6.0, ballZTranslation);
    balls[6].mvMatrix = translate(-1.0, 8.0, ballZTranslation);
    balls[7].mvMatrix = translate(1.0, 8.0, ballZTranslation);
    balls[8].mvMatrix = translate(0.0, 9.8, ballZTranslation);
}

var ballHitSounds;
var wallHitSounds;
var ambientSound;
function initSoundEffects() {
    ballHitSounds = [];
    wallHitSounds = [];
    for (var i = 0; i < 4; i++) {
        ballHitSounds[i] = new Audio('resources/shortHit.wav');
        ballHitSounds[i].volume = 0.5;
    }
    for (var i = 0; i < 10; i++) {
        wallHitSounds[i] = new Audio('resources/woodHit2.wav');
        wallHitSounds[i].volume = 0.2;
    }
    ambientSound = new Audio('resources/ambience3.wav');
    ambientSound.volume = 0.5;
    ambientSound.loop = true;
    ambientSound.play();
}

function playWallHitSound() {
    for (var i = 0; i < wallHitSounds.length; i++) {
        if (wallHitSounds[i].ended) {
            wallHitSounds[i].currentTime = 0;
        }
        if (wallHitSounds[i].currentTime == 0) {
            wallHitSounds[i].play();
            break;
        }
    }
}

function playBallHitSound() {
    for (var i = 0; i < ballHitSounds.length; i++) {
        if (ballHitSounds[i].ended) {
            ballHitSounds[i].currentTime = 0;
        }
        if (ballHitSounds[i].currentTime == 0) {
            ballHitSounds[i].play();
            break;
        }
    }
}
