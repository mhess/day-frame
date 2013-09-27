angular.module('util', [])
  .value('date2day', function(date) {
	   return [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');
	 });