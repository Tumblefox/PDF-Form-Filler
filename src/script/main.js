(() => {
  window.onload = () => {
    nunjucks.configure("./templates");

    var undoBuffer = [];
    var positionCache = {};
    var documentName = "";
    var writingCoordinates = {};
    var isWriting = false;

    document.getElementById("undo-btn").onclick = () => {
      if(undoBuffer.length < 1)
        return;
      let state = undoBuffer.pop();
      let ctx = document.getElementById(state.id).getContext("2d");

      let image = new Image();
      image.onload = () => {ctx.drawImage(image, 0, 0)};
      image.src = state.data;
    };

    document.getElementById("pdf-upload").onchange = (uploadEv) => {
      var file = uploadEv.srcElement.files[0];
      documentName = file.name;
      console.log(documentName);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = ev => {
        let base64 = ev.target.result;
        clearCachedData();
        loadPDF({data: atob(base64.replace("data:application/pdf;base64,", ""))})
      };
    };

    document.getElementById("save-btn").onclick = () => {
      if(document.getElementById("pdf-pages").children.length > 0)
        savePDF(documentName, "portrait");
    };

    var clearCachedData = () => {
      undoBuffer = [];
      positionCache = {};
      documentName = "";
      writingCoordinates = {};
      isWriting = false;
    };

    var canvasBehavior = (ev) => {
      let canvas = ev.srcElement;
      let posX = ev.pageX - canvas.offsetLeft;
      let posY = ev.pageY - canvas.offsetTop;

      let inputType = document.querySelectorAll("input[name^='input-type']:checked")[0];
      switch(inputType.value) {
        case "text":
          if(document.getElementById("content-input")) {
            dismissPrompt(canvas);
          }
          positionCache.x = posX;
          positionCache.y = posY;

          let prompt = document.createElement("div");
          prompt.id = "content-input";
          prompt.innerHTML = nunjucks.render("content-input.html");
          document.body.appendChild(prompt);


          let x = ev.pageX;
          let y = ev.pageY;
          prompt.style.position = 'absolute';
          prompt.style.left = x + "px";
          prompt.style.top = y + "px";

          document.getElementById("prompt-content-value").focus();
          document.getElementById("prompt-content-value").onkeyup = (keyEv) => {
            if(keyEv.keyCode === 13) {
              dismissPrompt(canvas);
              return;
            }
            if(keyEv.keyCode === 27) {
              keyEv.srcElement.value = "";
              dismissPrompt(canvas);
              return;
            }
          };
          setInputControls(canvas);
          break;
        case "checkbox":
          fillCheckbox(canvas, posX, posY);
          break;
        case "signature":
          if(document.getElementById("content-input")) {
            dismissPrompt(canvas);
          }
          positionCache.x = posX;
          positionCache.y = posY;

          let sigPrompt = document.createElement("div");
          sigPrompt.id = "content-input";
          sigPrompt.innerHTML = nunjucks.render("signature-input.html");
          document.body.appendChild(sigPrompt);
          setInputControls(canvas);

          sigX = ev.pageX;
          sigY = ev.pageY;
          sigPrompt.style.position = 'absolute';
          sigPrompt.style.left = sigX + "px";
          sigPrompt.style.top = sigY + "px";

          let sigCanvas = document.getElementById("signature-canvas");

          sigCanvas.onmousemove = (e) => {
            if(!isWriting) {
              return;
            }

            let clientX = e.pageX;
            let clientY = e.pageY;
            let sigContainer = document.getElementById("content-input");
            let hOffset = sigContainer.offsetLeft;
            let vOffset = sigContainer.offsetTop;

            if(e.type === 'touchmove') {
              clientX = e.touches[0].pageX;
              clientY = e.touches[0].pageY;
            }

            // console.log(`X: ${clientX - hOffset}, Y: ${clientY - vOffset}`);

            writingCoordinates.current = {
              x: clientX - hOffset,
              y: clientY - vOffset
            };

            if (!writingCoordinates.previous) {
              writingCoordinates.previous = {
                x: clientX - hOffset,
                y: clientY - vOffset
              };
            }

            let ctx = e.target.getContext("2d");
            ctx.beginPath();
            ctx.moveTo(writingCoordinates.previous.x, writingCoordinates.previous.y);
            ctx.lineTo(writingCoordinates.current.x, writingCoordinates.current.y);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();

            writingCoordinates.previous.x = writingCoordinates.current.x;
            writingCoordinates.previous.y = writingCoordinates.current.y;
          };

          sigCanvas.onmousedown = (e) => {
            isWriting = true;
          };

          sigCanvas.onmouseup = (e) => {
            let sigCanvas = document.getElementById("signature-canvas");
            let sigData = document.getElementById("signature-data");
            isWriting = false;
            delete writingCoordinates.previous;
            sigData.value = sigCanvas.toDataURL();
          };

          sigCanvas.onmouseleave = (e) => {
            let sigCanvas = document.getElementById("signature-canvas");
            let sigData = document.getElementById("signature-data");
            isWriting = false;
            delete writingCoordinates.previous;
            sigData.value = sigCanvas.toDataURL();
          };

          sigCanvas.ontouchmove = sigCanvas.onmousemove;
          sigCanvas.ontouchstart = sigCanvas.onmousedown;
          sigCanvas.ontouchend = sigCanvas.onmouseup;

          break;
      }
    };

    var setInputControls = (canvas) => {
      document.querySelectorAll(".input-save-btn").forEach(button => {
        button.onclick = () => dismissPrompt(canvas);
      });

      document.querySelectorAll(".input-delete-btn").forEach(button => {
        button.onclick = () => {
          if(document.getElementById("prompt-content-value")) {
            document.getElementById("prompt-content-value").value = "";
          }
          if(document.getElementById("signature-data")) {
            document.getElementById("signature-data").value = "";
          }
          dismissPrompt(canvas);
        };
      });
    };

    var dismissPrompt = (canvas) => {
      if(document.getElementById("prompt-content-value")) {
        dismissTextInput(canvas);
        return;
      }
      if(document.getElementById("signature-data")) {
        dismissSignatureInput(canvas);
        return;
      }
    };

    var dismissTextInput = (canvas) => {
      let text = document.getElementById("prompt-content-value").value;
      let font = document.getElementById("text-font").value;
      let fontSize = document.getElementById("text-font-size").value;
      if(text !== "") {
        addContent(canvas, positionCache.x, positionCache.y, text, font, fontSize);
      }
      document.getElementById("content-input").remove();
    };

    var dismissSignatureInput = (canvas) => {
      let imgData = document.getElementById("signature-data").value;
      if(imgData !== "") {
        addImage(canvas, positionCache.x, positionCache.y, imgData);
      }
      document.getElementById("content-input").remove();
      writingCoordinates = {};
      isWriting = false;
    };

    var fillCheckbox = (canvas, posX, posY) => {
      let shape = document.getElementById("checkbox-shape").value;
      let size = document.getElementById("checkbox-size").value;
      addShape(canvas, posX, posY, size, shape);
    };

    var addContent = (canvas, x, y, text, font, fontSize) => {
      undoBuffer.push({
        id: canvas.id,
        data: canvas.toDataURL()
      });
      let ctx = canvas.getContext("2d");
      if(fontSize !== undefined)
        ctx.font = `${fontSize}px ${font}`;
      ctx.fillText(text, x, y);
    };

    var addShape = (canvas, x, y, size, shape) => {
      undoBuffer.push({
        id: canvas.id,
        data: canvas.toDataURL()
      });
      let ctx = canvas.getContext("2d");
      let offset;
      switch(shape) {
        case "Square":
          offset = size * 2;
          ctx.fillRect(x-offset, y-offset, size * 2, size * 2);
          break;
        case "Round":
          offset = size;
          ctx.beginPath();
          ctx.arc(x-offset, y-offset, size, 0, 2 * Math.PI);
          ctx.fill();
          break;
      }
    };

    var addImage = (canvas, x, y, imgData) => {
      undoBuffer.push({
        id: canvas.id,
        data: canvas.toDataURL()
      });
      let ctx = canvas.getContext("2d");
      let image = new Image();
      image.onload = (ev) => {
        ctx.drawImage(ev.target, x, y);
      };
      image.src = imgData;
    };

    var loadPDF = (data) => {
      var loadingTask = pdfjsLib.getDocument(data);
      loadingTask.promise.then(
        (pdf) => {
          console.log('PDF loaded');
          document.getElementById("pdf-pages").innerHTML = "";
          // Fetch all pages
          for(let pageNumber = 1; pageNumber <= pdf["_pdfInfo"].numPages; pageNumber++) {
            pdf.getPage(pageNumber).then(function(page) {
              console.log('Page loaded');

              let scale = 2;
              let viewport = page.getViewport({scale: scale});

              // Prepare canvas using PDF page dimensions
              let canvas = document.createElement("canvas");
              canvas.id = `page-${pageNumber}`;
              canvas.classList.add("pdf-canvas");
              document.getElementById("pdf-pages").appendChild(canvas);
              let context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              canvas.onclick = canvasBehavior;

              // Render PDF page into canvas context
              var renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              var renderTask = page.render(renderContext);
              renderTask.promise.then(() => {
                console.log('Page rendered');
              });
            });
          }
        },
        (error) => {console.error(error)}
      );
    };

    var savePDF = (filename, orientation) => {
      const doc = new jsPDF({orientation: orientation});
      const margin = 10;
      const width = doc.internal.pageSize.getWidth() - (2 * margin);
      var position = margin;

      document.querySelectorAll(".pdf-canvas").forEach(canvas => {
        const height = ((canvas.height * width) / canvas.width);
        doc.addImage(canvas, 'PNG', margin, position, width, height, '', 'FAST');
        doc.addPage();
      });
      doc.save(filename);
    };
    // load all PDF pages
    // loadPDF("/img/job_application_form.pdf");
  }
})();
