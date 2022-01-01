const pubnub = new PubNub({
  publishKey: 'pub-c-9c9eb526-e5c8-406d-8dec-27c786c3f71a',
  subscribeKey: 'sub-c-e0074744-6a70-11ec-a2db-9eb9413efc82'
});

let drawChannel = "draw";
let commandChannel = "command";
let meLocked = false;

let myID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);


let drawStyle = 'dots';

//dots, letters

/* Drawing Section */

const mspaint = {
  sketchSelector: "",
  paintSelector: "",
  paintContext: null,
  currentIcon: null,
  canvas: null,
  start: function(selector1, selector2) {
    this.sketchSelector = selector1;
    this.paintSelector = selector2;

    let canvas = document.querySelector(this.paintSelector);
    this.canvas = canvas;
    this.paintContext = canvas.getContext("2d");

    pubnub.addListener({
      message: function(response) {
        if (response.channel === "draw") {
          drawFromStream(response.message);
        }
        if (response.channel === "command") {
          commandReceived(response.message)
        }
      },
      presence: function(presenceEvent) {
      }
    });

    pubnub.subscribe({
      channels: [drawChannel, commandChannel],
      withPresence: true
    });

    let plots = [];
    let sketch = document.querySelector(this.sketchSelector);
    let sketch_style = getComputedStyle(sketch);
    canvas.width = parseInt(sketch_style.getPropertyValue("width"));
    canvas.height = parseInt(sketch_style.getPropertyValue("height"));

    this.currentIcon = document.getElementById("current");

    let mouse = {
      x: 0,
      y: 0,
      getX: function() {
        return this.x;
      },
      getY: function() {
        return this.y - 108;
      }
    };

    /* Drawing on Paint App */
    this.setLineWidth(5);
    this.setLineCap("round");
    this.setLineJoin("round");
    this.setColor("black");
    this.setLocked(false);

    /* Mouse Capturing Work */
    let machine = this;


    /* Color changing */
    let tcolorButtons = document.getElementsByClassName("color");
    tButton = Math.floor(Math.random() * tcolorButtons.length)
    machine.setColor(tcolorButtons[tButton].getAttribute("data-color"));

// alert(`Combination of alt + ctrlKey + ${tButton}`);


    machine.paintContext.font = '40px sans-serif';
    machine.paintContext.textAlign = 'center';
    machine.paintContext.textBaseline = 'middle';

    canvas.addEventListener(
      "mousemove",
      function(e) {
        mouse.x = e.pageX - this.offsetLeft;
        mouse.y = e.pageY - this.offsetTop;
      },
      false
    );

    canvas.addEventListener(
      "mousedown",
      function(e) {
        onPaint();
        // canvas.addEventListener("mousemove", onPaint, false);
      },
      false
    );

    canvas.addEventListener(
      "mouseout",
      function() {
        // canvas.removeEventListener("mousemove", onPaint, false);
      },
      false
    );

    canvas.addEventListener(
      "mouseup",
      function() {
//        canvas.removeEventListener("mousemove", onPaint, false);
        pubnub.publish({
          channel: drawChannel,
          message: {
            plots: plots
          }
        });

        plots = [];
      },
      false
    );



    document.addEventListener('keydown', (event) => {
      const keyName = event.key;

      if (keyName === 'Control' || keyName === 'Alt') {
        // do not alert when only Control key is pressed.
        return;
      }

      if (event.ctrlKey && event.altKey) {
        if (keyName == 'd' || keyName == 'D'
            || keyName == 'l' || keyName == 'L'
            || keyName == 'c' || keyName == 'C'
            || keyName == 'z' || keyName == 'Z'
            || keyName == 'x' || keyName == 'X'
          ) {
            keyCommand(keyName, true);
          //  alert(`Combination of alt + ctrlKey + ${keyName}`);
          }

      } else {
        // alert(`Key pressed ${keyName}`);
      }
    }, false);


    function keyCommand (whichKey, sendMessage) {

      if (whichKey == 'd' || whichKey == 'D') {
         drawStyle = 'dots';
       } else if (whichKey == 'l' || whichKey == 'L') {
         drawStyle = 'letters';
       }  else if (whichKey == 'z' || whichKey == 'Z') {
         machine.setLocked(true)
      } else if (whichKey == 'x' || whichKey == 'X') {
         machine.setLocked(false)
       }
       else if (whichKey == 'c' || whichKey == 'C') {
           machine.paintContext.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (sendMessage)
        sendCommand(whichKey);

    }


    let onPaint = function() {
      //      machine.paintContext.lineTo(mouse.getX(), mouse.getY());
      //machine.paintContext.rect(mouse.getX()-2, mouse.getY()-2, 4, 4);

      if (meLocked) return;
      let tLetter = '';
      machine.paintContext.beginPath();

      if (drawStyle == 'dots') {
        machine.paintContext.arc(mouse.getX(), mouse.getY(), 10, 0, 2 * Math.PI, false);
      } else if  (drawStyle == 'letters') {
        tLetter = getRandomString(1);
        machine.paintContext.fillText(tLetter, mouse.getX(), mouse.getY());
      }

      machine.paintContext.fill();
      machine.paintContext.stroke();

      plots.push({id:myID, x: mouse.getX(), y: mouse.getY(), letter:tLetter, color: machine.paintContext.strokeStyle});

    };



    function getRandomString(length) {
        var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var result = '';
        for ( var i = 0; i < length; i++ ) {
            result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
        }
        return result;
    }



    function drawOnCanvas(plots) {

      machine.paintContext.beginPath();

      var mycolor = machine.paintContext.strokeStyle

      for (let i = 0; i < plots.length; i++) {
        if (plots[i].id != myID) {
            machine.paintContext.beginPath();
            machine.paintContext.fillStyle = plots[i].color;
            machine.paintContext.strokeStyle = plots[i].color;

            if (plots[i].letter =='')
              machine.paintContext.arc(plots[i].x, plots[i].y, 10, 0, 2 * Math.PI, false);
            else
              machine.paintContext.fillText(plots[i].letter, plots[i].x, plots[i].y);
            machine.paintContext.fill();
            machine.paintContext.stroke();
        }
      }

       machine.paintContext.strokeStyle = mycolor;
       machine.paintContext.fillStyle = mycolor;


    }

    function drawFromStream(message) {
      if (!message || message.plots.length < 1) return;
      drawOnCanvas(message.plots);
    }


    function sendCommand(command) {

      pubnub.publish({
        channel: commandChannel,
        message: {
          command: command
        }
      });

    }

    function commandReceived(message) {
      if (!message) return;
      keyCommand(message.command, false);

    }

    function showChar(e){
      alert(
        "Key Pressed: " + e.key + "\n"
        + "CTRL key pressed: " + e.ctrlKey + "\n"
      );
    }

    /* Color changing */
    let colorButtons = document.getElementsByClassName("color");
    for (let index = 0; index < colorButtons.length; index++) {
      colorButtons[index].addEventListener("click", function() {
        machine.setColor(this.getAttribute("data-color"));


      });
    }
  },
  setLineWidth: function(lineWidth) {
    this.paintContext.lineWidth = lineWidth;
  },
  setLineCap: function(lineCap) {
    this.paintContext.lineCap = lineCap;
  },
  setLineJoin: function(lineJoin) {
    this.paintContext.lineJoin = lineJoin;
  },
  setColor: function(color) {
    this.currentIcon.style.background = "#" + color;
    this.paintContext.strokeStyle = "#" + color;
    this.paintContext.fillStyle = "#" + color;
  },
  setLocked: function(isLocked) {
    // alert(`${isLocked}`);
    meLocked = isLocked;
    txt = "";
    if (meLocked) txt = "* LOCKED * "
    document.getElementById("myID").textContent = txt;
  }


};

/* Init Section */

window.download = function() {
  let dt = mspaint.canvas.toDataURL();
  dt = dt.replace(
    /^data:image\/[^;]/,
    "data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=art.png"
  );
  window.location.href = dt;
};

window.onload = function() {
  mspaint.start("#sketch", "#paint");
};

/* Modal Section */

// Get the modal
let modal = document.getElementById("myModal");

// Get the button that opens the modal
let btn = document.getElementById("openModal");

// Get the <span> element that closes the modal
let span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
};

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};
