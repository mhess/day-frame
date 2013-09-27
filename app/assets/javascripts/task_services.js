//= require util

angular.module('taskServices', ['rails', 'util'])

// The operations in the factory assume an $apply context

  .factory('TaskService',
	   ['railsResourceFactory', 'date2day', function(railsResourceFactory, date2day) {
	      return function(scope){
		var Task = railsResourceFactory({ url: "/tasks",
						  name: "task"});
		var day;
		var taskMap = {};
		var taskSrvObj = this;

		this.update = function(dateObj) {
		  day = date2day(dateObj);
		  this.list = [];
		  taskMap = {};
		  Task.query({day: day})
		    .then(function(res) {
			    angular.forEach(res, function(task) { taskSrvObj.add(task);});
			  });		  
		};

		this.add = function(taskObj) {
		  this.list.push(taskObj);
		  taskMap[taskObj.id] = taskObj;
		};

		this.modify = function(id, properties) {
		  var taskObj = taskMap[id];
		  angular.extend(taskObj, properties);
		  taskObj.update();
		};

		this.assign = function(id, newTime) {
		  this.modify(id, {start: newTime, day: day});
		};

		this.unassign = function(id) {
		  this.modify(id, {start: null, day: null});
		};

		scope.$watch('day', function () { taskSrvObj.update(scope.day); });
	      };
	    }]);