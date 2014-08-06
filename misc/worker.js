
console.log("READY: "+document.URL);
self.port.emit("ADNPageVisited", { "url": document.URL });
