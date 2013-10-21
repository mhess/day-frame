function Time(init, wake){
  if ( wake!==undefined )  {             // init is an offset
    this.minutes = init+wake;
  } else if ( init instanceof String ) { // init is from form
    console.log('foo');
    var min = parseInt(init);
    this.minutes = (Math.floor(min/100)*60)+(min % 100);    
  } else {
    this.minutes = init;                 // init is minutes
  }  
}

// Prototype configuration methods

Time.prototype.setPixelFactor = function(factor){
  Time.prototype.pixelFactor = factor;
};


// Instance methods
Time.prototype.toOffset = function(wake){
  //console.log(this.pixelFactor+' '+this.minutes+' '+wake);
  return this.pixelFactor*(this.minutes-wake);
};
Time.prototype.fromOffset = function(offset, wake){
  //console.log('fromOffset');
  var minutes = offset / this.pixelFactor;
  this.minutes = minutes+wake;
  return this;
};
Time.prototype.add = function(minutes) {
  return new Time(this.minutes+minutes);  
};
Time.prototype.addIn = function(minutes) {
  this.minutes+=minutes;
  return this;
};
Time.prototype.toInt = function() {
  var hrs = Math.floor(this.minutes / 60) * 100,
      min = this.minutes % 60;
  return hrs+min;
};
Time.prototype.toString = function() {
  var hours = Math.floor(this.minutes / 60 ),
      min = this.minutes % 60,
      ampm = hours < 12 ? "am" : "pm";
      min = (min/10) < 1 ? '0'+min : min;
  hours = hours < 13 ? hours : hours-12;
  return hours+":"+min+ampm;
};

angular.module('util', [])

  .value('Time', Time)

  .value('date2day', function(date) {
	   return [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');
	 })

  .value('hoursArray', function(start, end){
           var time = new Time(start);
	   var hrs = [];
	   for (; time.minutes < end; time.addIn(60) ) {
	     hrs.push(time.toString());
	   }
	   return hrs;
	 });