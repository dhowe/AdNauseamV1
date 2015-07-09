 /*global window:0, document:0, self:0 */

 $(function() {

   $("#version").text('v' + self.options.version);

   $('#x-close-button').click(function() {

     self.port && self.port.emit("close-firstrun");
   });

   $('#start').click(function() {

     self.port && self.port.emit("close-firstrun");
   });

   $('#video').click(function() {

     window.open('https://vimeo.com/111943439');
   });
 });
