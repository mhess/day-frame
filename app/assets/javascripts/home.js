var app = angular.module("app", ['ngResource']);


function time2px(time, scope) {
  var delta = time - scope.wake;
  return (Math.floor(delta/100)) * 60 + (delta%100);
};

function px2time(px, scope) {
  var delta = (Math.floor(px/60))*100 + px % 60;
  return scope.wake + delta;
};

var foo;
// This code assumes no pre-emtped multi-threading, otherwise there will be race conditions

app
  .value('hours', function(start, end){
	   start = start/100;
	   end = end/100;
	   var hrs = [];
	   var count = (end-start);
	   for ( var hr=start; hr < end; hr++ ) {
	     hrs.push((hr<12.5) ? hr+"am" : (hr-12)+"pm");
	   }
	   return hrs;
	 })

  .filter('assigned', function(){
	  return function(input, assigned) {
	    var result = [];
	    angular.forEach(input,
			    function(v,k){
			      if ( assigned ) {
				if ( v.start != null )  result.push(v);
			      } else {
				if ( v.start == null )  result.push(v);
			      }
			    });
	    return result;
	  };})

  .factory('Tasks', ['$resource', function($resource) {
		       return function(scope) {
			 function day_str() {
			   var d = scope.today;
			 return [d.getFullYear(), d.getMonth()+1, d.getDate()].join('-');
			 }
		       return $resource('/tasks/:id.:format',
					{format: 'json'},
					{query: {method:'GET',
						 params: {day: day_str},
						 isArray: true
						},
					 create:{method:'POST',
						 params: {title: "@title",
							  duration: "@dur",
							  priority: "@pri"}}});
			 };
		     }])
  .controller('viewCtrl', ['$scope', 'hours',
			   function($scope, hours) {
			     $scope.taskList = {1: {id: 1, start: null, priority: 3,
						    duration: 90},
						2: {id: 2, start: null, priority: 2,
						    duration: 120, start: 900},
						3: {id: 3, start: null, priority: 1,
						    duration: 180}};
			     $scope.wake = 700;
			     $scope.sleep = 2300;
			     $scope.hours = hours($scope.wake, $scope.sleep);
			     $scope.$watch('""+start+end', function(newTimes) {
					     $scope.snaps = hours(newTimes[0], newTimes[1]);
					   });			     
			   }])

  .directive('task', function() {
	       return { restrict: 'C',
			template: 'task {{task.id}} <span ng-show="task.start" ng-click="task.start=null">backlog</span>',
		        link: function(scope, element, attrs) {
			  var task = scope.task;
			  var jqEl = $(element);			  

			  // Assigned/unassigned specific setup
			  if ( task.start!=null ) {
			    jqEl.css({position: "absolute", left: 0,
				      top: time2px(task.start, scope),				      
				      height: task.duration})
			      .draggable({containment: ".timeline"});
			  } else {
			    jqEl.draggable({helper: "clone",
					    containment: "document"});
			  }

			  jqEl.draggable(
			    {snap: ".snap",
			     snapMode: "inner",
			     snapTolerance: 25,
			     revert: 'invalid',
			     start: function(event, ui) {
			       if ( task.start == null ) {
				 ui.helper.css("height", task.duration);
				 jqEl.hide(); 
			       }
			     },
			     stop: function(event, ui) {
			       if ( task.start == null )
				 jqEl.css("height", "");
			       jqEl.show();
			     }}
			  );
			}
		      };})


  .directive('timeline', function() {
	       return { restrict: 'C',
			link: function(scope, element, attrs) {
			  var jqEl = $(element);
			  var top = jqEl.offset().top;
			  console.log("timeline offset");
			  console.log(jqEl.offset());
			  jqEl.droppable(
			    { drop: function (event, ui) {
				var dragged = ui.draggable;
				var task = scope.taskList[dragged.attr("x-task-id")];
				scope.$apply(
				  function() {
				    task.start = px2time(ui.offset.top - top, scope);
				  });
				console.log(task.start);
			      }}
			  );
			}			
		      };});