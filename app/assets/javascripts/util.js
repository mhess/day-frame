var pixelFactor;
function setPixelFactor(factor){
  pixelFactor = factor;
};

// Time constructor
function Time(init, wake){
  if ( wake!==undefined )  {               // init is an offset
    this.minutes = init+wake.minutes;
  } else if ( typeof init === 'string' ) { // init is from form
    var arr = init.split(':');
    var hrs = parseInt(arr[0]);
    var min = parseInt(arr[1]);
    this.minutes = (hrs*60)+min;    
  } else {
    this.minutes = init;                   // init is minutes
  }
}

// Instance methods
Time.prototype.toOffset = function(wake) {
  //console.log(this.pixelFactor+' '+this.minutes+' '+wake);
  return pixelFactor*(this.minutes-wake.minutes);
};
Time.prototype.fromOffset = function(offset, wake){
  var minutes = offset / pixelFactor;
  this.minutes = minutes+wake.minutes;
  return this;
};
Time.prototype.add = function(minutes) {  
  minutes = minutes instanceof Object ? minutes.min : minutes;
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
      ampm = Math.floor((hours)/12) % 2 ? "pm" : "am";
      min = (min/10) < 1 ? '0'+min : min;
  hours = hours % 12 || 12;
  return hours+":"+min+ampm;
};
Time.prototype.toForm = function() {
  var hours = Math.floor(this.minutes / 60 ),
      min = this.minutes % 60;
  hours = hours > 9 ? hours : '0'+hours;
  min = min > 9 ? min : '0'+min;
  return hours+":"+min;
};
Time.prototype.lt = function(t) {
  return this.minutes < t.minutes;
};
Time.prototype.gt = function(t) {
  return this.minutes > t.minutes;
};
Time.prototype.floor = function() {
  var delta = this.minutes % 60;
  return new Time(this.minutes-delta);
};
Time.prototype.ceil = function() {
  var delta = this.minutes % 60;
  return new Time(this.minutes+60-delta);
};
Time.prototype.diff = function(other) {
  return new Minutes(this.minutes - other.minutes);
};


// Minutes Constructor
function Minutes(minOrHour, min) {
  if (min===undefined) {
    this.min = parseInt(minOrHour,10);
  } else {
    this.min = (parseInt(minOrHour || 0) * 60,10) + parseInt(min || 0,10);
  }    
}
Minutes.prototype.withHrs = function()  {
  var hr = Math.floor(this.min / 60),
      min = this.min % 60;
  return {hr: hr, min: min};
}
Minutes.prototype.fromPx = function(pixels) {
  this.min = pixels / pixelFactor;
};
Minutes.prototype.pixels = function() {
  return this.min * pixelFactor;  
};
Minutes.prototype.toString = function() {
  var o = this.withHrs(),
      arr = [];
  o.hr && arr.push(o.hr+' hr');
  o.min && arr.push(o.min+' min');
  return arr.join(' ');
};


function closest5(i){
  i = Math.round(i);
  mod = i % 5;
  if ( mod ) i = mod > 3 ? i+5-mod : i-mod;
  return i;
}

function closest15(i){
  i = Math.round(i);
  mod = i % 15;
  if ( mod ) i = mod > 3 ? i+15-mod : i-mod;
  return i;  
}

angular.module('util', [])

  .value('setPixelFactor', setPixelFactor)

  .value('Time', Time)

  .value('Minutes', Minutes)

  .value('date2day', function(date) {
	   return [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');
	 })

  .value('hoursArray', function(wake, sleep){
           var time = angular.copy(wake);
	   var hrs = [];
	   for (; time.lt(sleep); time.addIn(60) ) {
	     hrs.push(time.toString());
	   }
	   return hrs;
	 });