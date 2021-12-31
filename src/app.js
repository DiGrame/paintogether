const pubnub = new PubNub({
  publishKey: 'pub-c-9c9eb526-e5c8-406d-8dec-27c786c3f71a',
  subscribeKey: 'sub-c-e0074744-6a70-11ec-a2db-9eb9413efc82'
});

let drawChannel = "draw";
let chatChannel = "chat";
let colorChannel = "color";

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

    let universalColor = "";

    pubnub.addListener({
      message: function(response) {
        if (response.channel === "draw") {
          drawFromStream(response.message);
        }
        if (response.channel === "chat") {
          publishMessages(response.message);
        }
        if (response.channel === "color") {
          universalColor = response.message.color;
        }
      },
      presence: function(presenceEvent) {
        if (presenceEvent.action === "join") {
          addClient(presenceEvent);
        }

        if (presenceEvent.action === "timeout") {
          removeClient(presenceEvent);
        }
      }
    });

    pubnub.subscribe({
      channels: [drawChannel, chatChannel, colorChannel],
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

    /* Mouse Capturing Work */
    let machine = this;
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
        canvas.removeEventListener("mousemove", onPaint, false);
      },
      false
    );

    canvas.addEventListener(
      "mouseup",
      function() {
        canvas.removeEventListener("mousemove", onPaint, false);
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

    let onPaint = function() {
      //      machine.paintContext.lineTo(mouse.getX(), mouse.getY());
      //machine.paintContext.rect(mouse.getX()-2, mouse.getY()-2, 4, 4);

      machine.paintContext.beginPath();
      machine.paintContext.arc(mouse.getX(), mouse.getY(), 10, 0, 2 * Math.PI, false);
      machine.paintContext.fill();
      machine.paintContext.stroke();

      plots.push({ x: mouse.getX(), y: mouse.getY() });

    };

    function drawOnCanvas(plots,color) {

      machine.paintContext.beginPath();

      var mycolor = machine.paintContext.strokeStyle

      for (let i = 0; i < plots.length; i++) {
        machine.paintContext.beginPath();
        machine.paintContext.arc(plots[i].x, plots[i].y, 10, 0, 2 * Math.PI, false);
        machine.paintContext.fillStyle =  "#" + color;
        machine.paintContext.fill();
        machine.paintContext.strokeStyle = "#" + color;
        machine.paintContext.stroke();
      }

       // machine.paintContext.strokeStyle = mycolor;
       // machine.paintContext.fillStyle = mycolor;


    }

    function drawFromStream(message) {
      if (!message || message.plots.length < 1) return;
      drawOnCanvas(message.plots, universalColor);
    }

    /* Color changing */
    let colorButtons = document.getElementsByClassName("color");
    for (let index = 0; index < colorButtons.length; index++) {
      colorButtons[index].addEventListener("click", function() {
        machine.setColor(this.getAttribute("data-color"));

        //Publish color to channel
        pubnub.publish({
          channel: colorChannel,
          message: {
            color: this.getAttribute("data-color")
          }
        });
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
  }
};

function removeClient(response) {
  document.getElementById("users").textContent = response.occupancy;
}

function addClient(response) {
  document.getElementById("users").textContent = response.occupancy;
}
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
  chat();
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
