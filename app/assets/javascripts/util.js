function formatTime(time) {
  var hr = Math.floor(time/100);
  var min = time % 100;
  min = (min/10) < 1 ? "0"+min : min;
  if ( time < 1200 ) {
    return hr+":"+min+"am";
  } else if ( time < 1300 ) {
    return hr+":"+min+"pm";
  }
  return hr-12+":"+min+"pm";
};

angular.module('util', [])

  .value('formatTime', formatTime)

  .value('addMinutes', function(time, duration) {
	   var hr = Math.floor(time / 100);
	   var min = time % 100;
	   var addHr = Math.floor(duration / 60);
	   var addMin = duration % 60;
	   var newMin = min+addMin;
	   if ( (newMin) > 60 ) {
	     addHr++;
	     newMin = newMin % 60;
	   }
	   return ((hr+addHr)*100)+newMin;
	 })

  .value('date2day', function(date) {
	   return [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');
	 })

  .value('hoursArray', function(start, end){
	   var hrs = [];
	   for ( var hr=start; hr < end; hr+=100 ) {
	     hrs.push(formatTime(hr));
	   }
	   return hrs;
	 });