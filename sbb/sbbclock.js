/**
 * The famous SBB clock, made with JavaScript.
 *
 * Copyright SBB CFF FFS. The design of the clock itself
 * is a copyright and a trademark of the Swiss railways.
 * Made without permission.
 *
 * https://en.wikipedia.org/wiki/Swiss_railway_clock
 */
class SBBClock {
  #ctx = null;
  #radius = null;
  #width = null;
  #height = null;
  #running = false;
  #forcedTime = null;

  // Things are drawn in proportion to the canvas radius
  #canvasPercentage = 0.9; // The clock takes only 90% of the canvas
  #borderWidth = 0.05;     // Width of the gray border around the clock
  #majorMarkWidth = 0.06;  // Width of the major marks every 5 minutes
  #minorMarkWidth = 0.025;  // Width of minute markers
  #markOffset = 0.07;
  #minorMarkLength = 0.14;
  #majorMarkLength = 0.29;
  #handExtensionBackwards = 0.222;
  #hourHandLength = 0.6;
  #hourHandWidth = 0.1;
  #minuteHandLength = 0.88;
  #minuteHandWidth = 0.08;
  #secondsHandWidth = 0.026;
  #secondsHandLength = 0.60;
  #secondsHandExtensionBackwards = 0.28;
  #secondsBallWidth = 0.1;
  #secondsBallCenter = 0.61;

  // For the dampening oscillation of the minutes hand
  #dampingFrequency = 40;
  #dampingFactor = 0.1

  // The time it takes to the seconds hand to rotate, in seconds
  #secondsHandRotationTime = 58.5;

  // Colors
  #faceColor = 'white';
  #borderColor = '#C0C0C0';
  #marksColor = 'black';
  #handColor = 'black';
  #secondsHandColor = '#DA291C';

  constructor(obj) {
    let canvas = document.getElementById(obj);
    if (canvas === null) {
      throw "Please provide a <canvas> object to draw";
    }
    this.#ctx = canvas.getContext("2d");
    this.#height = canvas.height;
    this.#width = canvas.width;
	console.log("Width: " + canvas.width);
    let size = Math.min(this.#height, this.#width);
    this.#radius = size / 2;

    // Move origin of coordinates to center
    this.#ctx.translate(this.#radius, this.#radius);

    // Reduce drawing area
    this.#radius = this.#radius * this.#canvasPercentage;

    // Kick off animation
    this.#update();
  }

  // PUBLIC METHODS

  get running () {
    return this.#running;
  }

  set time (newTime) {
    this.#running = false;
    this.#forcedTime = newTime;
    this.#drawClock();
  }

  start () {
    this.#running = true;
    this.#forcedTime = null;
    requestAnimationFrame(this.#update.bind(this));
  }

  stop () {
    this.#running = false;
  }

  // PRIVATE METHODS

  #clear () {
    this.#ctx.clearRect(0, 0, this.#width, this.#height);
  }

  #update () {
    if (this.#running) {
      this.#clear();
      this.#drawClock();
      requestAnimationFrame(this.#update.bind(this));
    }
  }

  #drawClock () {
    this.#drawFace();
    this.#drawMarks();
    this.#drawTime();
  }

  #drawFace () {
    this.#ctx.fillStyle = this.#faceColor;
    this.#ctx.strokeStyle = this.#borderColor;
    this.#ctx.lineWidth = this.#radius * this.#borderWidth;

    this.#ctx.beginPath();
    this.#ctx.arc(0, 0, this.#radius, 0, Math.PI * 2);
    this.#ctx.fill();
    this.#ctx.stroke();
  }

  #drawMarks () {
    this.#ctx.strokeStyle = this.#marksColor;
    for (let num = 1; num <= 60; num++) {
      let ang = num * Math.PI / 30;
      this.#ctx.rotate(ang);

      this.#ctx.beginPath();
      if (num % 5 == 0) {
        // Major marks every 5 minutes
        this.#ctx.lineWidth = this.#radius * this.#majorMarkWidth;
        this.#ctx.moveTo(this.#radius - this.#radius * this.#markOffset, 0);
        this.#ctx.lineTo(this.#radius * (1 - this.#majorMarkLength), 0);
      }
      else {
        // Minor marks every other minute
        this.#ctx.lineWidth = this.#radius * this.#minorMarkWidth;
        this.#ctx.moveTo(this.#radius * (1 - this.#markOffset), 0);
        this.#ctx.lineTo(this.#radius * (1 - this.#minorMarkLength), 0);
      }
      this.#ctx.stroke();

      // Reset the rotation
      this.#ctx.rotate(-ang);
    }
  }

  #timeToDraw () {
    let time = this.#forcedTime;
    if (time === null) {
      time = new Date();
    }
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const ms = time.getUTCMilliseconds();
    return { hours, minutes, seconds, ms };
  }

  #dampenedSpringOscillation(seconds) {
    if (seconds < 0 || seconds > 5) return 0;
    const omega = 2 * Math.PI * this.#dampingFrequency;
    const decay = Math.exp(-this.#dampingFactor * omega * seconds);
    return decay * Math.sin(omega * seconds);
  }

  #drawTime () {
    const { hours, minutes, seconds, ms } = this.#timeToDraw();
    const actualSeconds = seconds + ms / 1000;

    // The contribution of seconds in the hour hand movement is perceptible!
    const hoursAngle = (hours * Math.PI / 6) +
      (minutes * Math.PI / (6 * 60)) +
      (seconds * Math.PI / (360 * 60));
    const hoursLength = this.#radius * this.#hourHandLength;
    const hoursWidth = this.#radius * this.#hourHandWidth;
    this.#drawHand(hoursAngle, hoursLength, hoursWidth);

    // Make the minutes hand "jump" from mark to mark,
    // and make it oscillate a bit until settling
    const minutesAngle = (minutes * Math.PI / 30);
    const minutesLength = this.#radius * this.#minuteHandLength;
    const minutesWidth = this.#radius * this.#minuteHandWidth;
    const oscillationContribution = this.#dampenedSpringOscillation(actualSeconds) / 3;
    this.#drawHand(minutesAngle - oscillationContribution, minutesLength, minutesWidth);

    // The seconds handle takes 58.5 seconds to run, then stops for 1.5 seconds
    let secondsAngle = (actualSeconds * Math.PI / 30);
    const factor = 60 / this.#secondsHandRotationTime;
    secondsAngle = secondsAngle * factor;
    if (secondsAngle > (Math.PI * 2)) {
      secondsAngle = Math.PI * 2;
    }
    this.#drawSecondsHand(secondsAngle);
  }

  #drawSecondsHand (angle) {
    // Red line for the seconds
    this.#ctx.strokeStyle = this.#secondsHandColor;
    this.#ctx.beginPath();
    this.#ctx.lineWidth = this.#radius * this.#secondsHandWidth;
    this.#ctx.moveTo(0, 0);
    this.#ctx.rotate(angle);
    this.#ctx.lineTo(0, -this.#radius * this.#secondsHandLength);

    // Make the line extend backwards
    this.#ctx.lineTo(0, this.#radius * this.#secondsHandExtensionBackwards);
    this.#ctx.stroke();

    // Little red ball on top of seconds hand
    this.#ctx.fillStyle = this.#secondsHandColor;
    this.#ctx.beginPath();
    const ballWidth = this.#radius * this.#secondsBallWidth;
    const ballOffset = -this.#radius * this.#secondsBallCenter;
    this.#ctx.arc(0, ballOffset, ballWidth, 0, Math.PI * 2);
    this.#ctx.fill();

    // Reset the rotation
    this.#ctx.rotate(-angle);
  }

  #drawHand (angle, length, width) {
    this.#ctx.strokeStyle = this.#handColor;
    this.#ctx.lineWidth = width;

    this.#ctx.beginPath();
    this.#ctx.moveTo(0, 0);
    this.#ctx.rotate(angle);
    this.#ctx.lineTo(0, -length);

    // Make the line extend backwards
    this.#ctx.lineTo(0, this.#radius * this.#handExtensionBackwards);
    this.#ctx.stroke();

    // Reset the rotation
    this.#ctx.rotate(-angle);
  }
}