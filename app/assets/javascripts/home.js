//= require angularjs/rails/resource
//= require task_services

var app = angular.module("app", ['taskServices'])

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
	    var pred = assigned ? function(s) {return s != null;} : function(s) {return s == null;};
	    angular.forEach(input, function(i) {
			      if ( pred(i.start) ) result.push(i);
			    });
	    return result;
	  };})

  .factory('pxTime', function() {
	     return function(scope) {
	      this.px = function(time) {
		var delta = time - scope.wake;
		return (Math.floor(delta/100)) * 60 + (delta%100);		
	      };
	       this.time = function(px) {
		 var delta = (Math.floor(px/60))*100 + px % 60;
		 return scope.wake + delta;
	       };
	     };	     
	   })

  .controller('viewCtrl', ['$scope', 'hours', 'TaskService', 'pxTime',
			   function($scope, hours, TaskService, pxTime) {
			     $scope.day = new Date();
			     $scope.wake = 700;
			     $scope.sleep = 2300;
			     $scope.Tasks = new TaskService($scope);
			     $scope.pxTime = new pxTime($scope);
			     $scope.$watch('wake+""+sleep', function(newTimes) {
					     $scope.hours = hours($scope.wake, $scope.sleep);
					   });
			   }])

  .directive('task', function() {
	       return { restrict: 'C',
			template: 'task {{task.id}} <span ng-show="task.start" ng-click="backlog()">backlog</span>',
		        link: function(scope, element, attrs) {
			  var task = scope.task;
			  var jqEl = $(element);

			  scope.backlog = function() {
			    scope.Tasks.unassign(task.id);
			  };

			  // Assigned/unassigned specific setup
			  if ( task.start!=null ) {
			    jqEl.css({position: "absolute", left: 0,
				      top: scope.pxTime.px(task.start, scope),				      
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
			     stop: function(event, ui) { jqEl.show(); }
			    }
			  );
			}
		      };})


  .directive('timeline', function() {
	       return { restrict: 'C',
			link: function(scope, element, attrs) {
			  var jqEl = $(element);
			  var top = jqEl.offset().top;
			  jqEl.droppable(
			    { drop: function (event, ui) {
				var taskId = ui.draggable.attr("x-task-id");
				var newTime = scope.pxTime.time(ui.offset.top - top);
				scope.$apply('Tasks.assign('+taskId+','+newTime+')');				
			      }}
			  );
			}			
		      };});