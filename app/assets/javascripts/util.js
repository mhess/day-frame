(function(){
var pixelFactor;
function setPixelFactor(factor){
  pixelFactor = factor;
};

var docEl = document.documentElement;
var $doc = $(document);

function affixTop($el, className, rel){
  relEl = rel ? $el.parent() : $el;
  var fixed = false,
    top = relEl.offset().top;
  if ( top < docEl.scrollTop ) {
    fixed = true;
    $el.addClass(className);}
  $doc.on('scroll.myAffixTop',
    function(){
      if ( fixed ) {
        if ( docEl.scrollTop < top ){
          fixed = false;
          $el.removeClass(className);}
        } else if ( docEl.scrollTop >= top ){
          fixed = true;
          $el.addClass(className);}});
  return function(){$doc.off('scroll.myAffixTop')}}

// Time constructor
function Time(init, wake){
  if ( wake!==undefined )  {               // init is an offset
    this.minutes = init+wake.minutes;
  } else if ( typeof init === 'string' ) { // init is from form
    this.fromForm(init);
  } else if ( init instanceof Date) {      // init is a Date objb
    this.minutes = (init.getHours()*60)+init.getMinutes();
  } else {
    this.minutes = init;                   // init is minutes
  }
}

// Instance methods
Time.prototype.toOffset = function(wake) {
  return pixelFactor*(this.minutes-wake.minutes);
};
Time.prototype.fromOffset = function(offset, wake){
  var minutes = offset / pixelFactor;
  this.minutes = minutes+wake.minutes;
  return this;
};
Time.prototype.fromForm = function(str){
  var arr = str.split(':');
  var hrs = parseInt(arr[0]);
  var min = parseInt(arr[1]);
  this.minutes = (hrs*60)+min;
  return this;
};
Time.prototype.fromTime = function(time){
  this.minutes = time.minutes;
  return this;
};
Time.prototype.fromDate = function(date){
  this.minutes = (date.getHours()*60)+date.getMinutes();
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
    this.min = (parseInt(minOrHour || 0,10) * 60) + parseInt(min || 0,10);
  }    
}
Minutes.prototype.withHrs = function()  {
  var hr = Math.floor(this.min / 60),
      min = this.min % 60;
  return {hr: hr, min: min};
};
Minutes.prototype.fromPx = function(pixels) {
  this.min = pixels / pixelFactor;
};
Minutes.prototype.fromMinutes= function(min){
  this.min = min.min; return this;
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

function closest(i, n){
  n = Math.round(n);
  mod = n % i;
  return mod ? (mod > (i>>1) ? n+i-mod : n-mod) : n;}

angular.module('util', [])

  .value('setPixelFactor', setPixelFactor)

  .value('closest', closest)

  .value('affixTop', affixTop)

  .value('Time', Time)

  .value('Minutes', Minutes)

  .value('date2day', function(date) {
	   return [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');
	 })

  .value('hoursArray', function(wake, sleep){
    var time = angular.copy(wake);
	  var hrs = [];
	  for (; time.lt(sleep); time.addIn(60) ) {
	    hrs.push(time.toString());}
	 return hrs;
	 });
})();