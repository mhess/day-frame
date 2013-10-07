//= require task_services
//= require util

var app = angular.module("app", ['taskServices', 'util'])

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

  .controller('viewCtrl', ['$scope', 'TaskService', 'hoursArray', 'pxTime',
			   function($scope, TaskService, hoursArray, pxTime) {
			     // State for this controller
			     $scope.day = new Date();
			     $scope.wake = 700;
			     $scope.sleep = 2300;
			     $scope.modal = {active: false};
			     
			     // Services attached to this controller's scope
			     $scope.Tasks = new TaskService($scope);
			     $scope.pxTime = new pxTime($scope);
			     
			     $scope.changeDay = function(change) {
			       if ( change==null ) {
				 $scope.day = new Date();
			       } else { $scope.day.setDate($scope.day.getDate()+change); }
			     };
			     
			     $scope.$watch('wake+""+sleep', function() {
					     $scope.hours = hoursArray($scope.wake, $scope.sleep);
					   });
			   }])

  .directive('task', ['formatTime', 'addMinutes', '$window',
		      function(formatTime, addMinutes, $window) {
			return { restrict: 'C',
				 templateUrl: 'angular/task.html',
				 replace: true,
				 link: function(scope, el) {
				   var task = scope.task;
				   angular.extend(scope, {formatTime:formatTime, addMinutes:addMinutes});

				   // Set task element style according to model object
				   // properties (start, duration)
				   scope.getStyle = function() {
				     if (task.start==null) return {};
				     return {top: scope.pxTime.px(task.start),
					     height: task.duration};
				   };
				   
				   scope.deleteTask = function() {
				     if ($window.confirm("Are you sure you want to delete this task?")){
				       scope.Tasks.delete(task.id);
				     }
				   };

				   // Set CSS/draggable based on whether assigned or not
				   if (task.start!=null) {
				     el.css({position: "absolute", left:0})
				       .draggable({containment:'.timeline'});
				   } else {
				     el.draggable({helper: "clone", containment: "document"});
				   }
				   
				   el.draggable(
				     {snap: ".snap",
				      snapMode: "inner",
				      snapTolerance: 25,
				      revert: 'invalid',
				      // Hide original task element if coming from taskList
				      start: function(event, ui) {
					if ( task.start==null ) {
					  ui.helper.css("height", task.duration);
					  el.hide(); 
					}
				      },
				      stop: function(event, ui) {
					el.show(); }
				     });
				 }};}])

  .directive('timeline', function() {
	       return { restrict: 'C',
			link: function(scope, el) {			
			  el.droppable(
			    {drop: function (event, ui) {
			       var taskId = ui.draggable.attr("x-task-id");
			       var offset = Math.round(ui.offset.top - el.offset().top);
			       var mod = offset % 5;
			       if (mod) offset = mod < 3 ? offset-mod : offset+5-mod;
			       var newTime = scope.pxTime.time(offset);
			       console.log(newTime);
			       scope.$apply( function() {
					       scope.Tasks.modify(taskId, {start: newTime});
					     });
			     }});
			}	
		      };})

  .directive('taskModal', function() {
	       return {restrict: 'C',
		       scope: true,
		       replace: true,
		       templateUrl: 'angular/task_modal.html',
		       link: function(scope, element, attrs) {

			 // This is the task being operated on by the modal as well
			 // as the flag which shows/hides the modal
			 scope.task = null;

			 // Register this directive/modal's handle on the
			 // controller's modal object
			 scope.modal.task = function(task) {
			   scope.modal.active = 'task';
			   scope.header = task==null ? "New Task" : "Edit Task";
			   scope.task = task || {};
			   scope.taskTmpl = {};
			   angular.extend(scope.taskTmpl, task);
			 };

			 scope.save = function() {			  			   
			   if ( 'id' in scope.task ) {
			     scope.Tasks.modify(scope.task.id, scope.taskTmpl);
			   } else {
			     scope.Tasks.create(scope.taskTmpl);
			   }
			   scope.close();
			 };

			 scope.close = function() {
			   scope.modal.active=null;
			   scope.task=null;
			 };
		       }
		      };});