//= require util

var oneDayMs = 1000*60*60*24;

angular.module('tasks', ['util'])

  // All operations in this service assume an $apply context
  .service('$tasks',
    ['date2day', 'setPixelFactor', 'Time', 'Minutes', '$q',
     function(date2day, setPixelFactor, Time, Minutes, $q) {
       var taskSvc = this,
       serialDay,
       taskMap = {};

       var timeline = this.timeline = [];
       var backlog = this.backlog = [];
       var stores = this.stores = {};

       this.createStore = null;
       this.date = new Date();

       setPixelFactor(1);

       function taskCmp(t1,t2){
         if ( t1.start.lt(t2.start) ) return -1;
         if ( t1.start.gt(t2.start) ) return 1;
         return 0;}

       function mutateDate(self, other) {
         self.setFullYear(other.getFullYear());
         self.setMonth(other.getMonth());
         self.setDate(other.getDate());
         return self;}
       
       function Task(props){
         angular.copy(props, this);
         this.duration = new Minutes(this.duration.min);
         this.start = this.start ? new Time(this.start.minutes) : null;}
       
       Task.prototype.update = function(mod){
         var task = this;
         mod && angular.extend(task, mod);
         task.day = task.start===null ? null : serialDay;
         if ( task.start===null ) {
           var tindex = timeline.indexOf(task);
           tindex > -1 && timeline.splice(tindex, 1);
           backlog.indexOf(task) < 0 && backlog.push(task);
         } else {
           var bindex = backlog.indexOf(task);
           bindex > -1 && backlog.splice(bindex, 1);
           timeline.indexOf(task) < 0 && timeline.push(task);
         }
         timeline.sort(taskCmp);
         task.store.update(task)
           .then(null,function(){alert("Task modification failed");});};

       Task.prototype.delete = function(){
         var task = this;
         task.store.delete(this).then(
           function(){
             if ( task.start===null ) {
               backlog.splice(backlog.indexOf(task), 1);
             } else {
               timeline.splice(timeline.indexOf(task), 1);}},
           function(){alert("Task deletion failed");});};
       
       function addTask(task){
         taskMap[task.id] = task;
         if ( task.start===null ) backlog.push(task);
         else timeline.push(task);}

       function query(params){
         var promises = [];
         angular.forEach(stores, 
           function(s,i){
            promises.push(s.query(params));});
         return $q.all(promises).then(
           function(resultsArray){
             angular.forEach(resultsArray,
               function(tasks){
                 angular.forEach(tasks,
                   function(taskProps){addTask(new Task(taskProps));})});
             timeline.sort(taskCmp);});}
       
       this.get = function(tid){return taskMap[tid];};

       this.create = function(props) {
         if ( props.start ) props.day = serialDay;               
         this.createStore.create(new Task(props))
           .then(
            function(task){addTask(task);},
            function(){alert("Task creation failed");});};

       this.setDay = function(dateObj){
         serialDay = date2day(dateObj);
         backlog.splice(0, backlog.length);
         timeline.splice(0, timeline.length);
         taskMap = {};
         return query({day: dateObj})
           .then(function(){mutateDate(taskSvc.date, dateObj);});};

       this.changeDay = function(delta){
         if (!delta) return this.setDay(new Date());
         else return this.setDay(new Date(this.date.getTime()-(delta*oneDayMs)));};

      this.addStore = function(storeObj, create){
        if ( create ) this.createStore = storeObj;
        if ( !this.stores[storeObj.id] ) this.stores[storeObj.id] = storeObj;
        return this;};

      this.removeStore = function(id){
        var store = this.stores[id];
        if ( !store ) return false;
        delete this.stores[id];
        return true;};
  }])

  .service('remoteStore',
    ['date2day', '$http', 'Time', 'Minutes',
     function(date2day, $http, Time, Minutes){
       var path = '/tasks';
       var that = this;
       
       function serialize(task){
         var copy = angular.copy(task);
         if ( copy.start ) copy.start = task.start.minutes;
         copy.duration = copy.duration.min;
         delete copy.id;
         delete copy.store;
         delete copy.editable;
         return {task:copy};}
       
       function deserialize(task){
         task.duration = new Minutes(task.duration);
         task.start = task.start ? new Time(task.start) : null;
         task.store = that;
         task.editable = true;
         return task;}

       this.id = 'remote';

       this.create = function(task){
         return $http.post(path+'.json', serialize(task))
           .then(function(resp){
             task.id = resp.data.id;
             task.store = that;
             task.editable = true;
             return task;});};

       this.update = function(task){
         return $http.put(path+'/'+task.id+'.json', serialize(task))
           .then(function(){return task;});};

       this.delete = function(task){
         return $http.delete(path+'/'+task.id+'.json');};
       
       this.query = function(params){
         var queryInput = angular.copy(params);
         queryInput.day = date2day(params.day);
         return $http.get(path+'.json',{params:queryInput})
           .then(function(resp){
              return resp.data.map(deserialize);});};
  }])

  .service('localStore', 
    ['$q', 'date2day', 'Minutes', 'Time',
     function($q, date2day, Minutes, Time){
      var that = this;
       var tasks = {
         1:{id:1,day:null,start:null,
           priority:2,
           title:"Take the dog for a walk",
           duration: new Minutes(30),
           description:"Check out the new park down the street."},
         2:{id:2,day:null,start:null,
           priority:4,
           title:"Restock dilithium crystals",
           duration: new Minutes(105),
           description:"This should give us a 15.4% increase in efficiency."},
         3:{id:3,day:null,start:null,
           priority:3,
           title:"Cook dinner",
           duration: new Minutes(60),
           description:null}};

       angular.forEach(tasks, function(t,i){
        t.store = that;
        t.editable = true;});

       var idCount = 4;

       this.id = 'local';

       this.create = function(task){
         task.id = idCount++;
         task.store = this;
         task.editable = true;
         tasks[task.id] = task;
         return $q.when(task);};

       this.update = function(task){
         tasks[task.id] = angular.copy(task);
         return $q.when(task);};

       this.delete = function(task){
         delete tasks[task.id];
         return $q.when(null);};
       
       this.query = function(params){
         var result = [];
         var day = date2day(params.day);
         angular.forEach(
           tasks,
           function(task, id){
             if ( task.start===null || task.day===day )
               result.push(task);});
         return $q.when(result);};
  }])

 .factory('gCalStore',
  ['$gclient', 'Time', 'Minutes', 'date2day',
  function($gclient, Time, Minutes, date2day){

    // Assumes timezone on ts is UTC
    function from3339(ts){
      var dAndT = ts.split('T'),
        d = angular.forEach(dAndT[0].split('-'),
          function(i){return parseInt(i, 10);}),
        t = angular.forEach(dAndT[1].split(':'), 
          function(i){return parseInt(i, 10);});
      return new Date(d[0], d[1]-1, d[2], t[0], t[1]);};

    // Remove data more precise than day
    function dayOnly(o){
      var y = o.getFullYear(),
        m = o.getMonth(),
        d = o.getDate();
      return new Date(y,m,d);}

    function deserialize(store, event){
      var sd = from3339(event.start.dateTime),
        ed = from3339(event.end.dateTime),
        st = (new Time()).fromDate(sd),
        et = (new Time()).fromDate(ed);
      var task = {
        id: event.id,
        title: event.summary,
        start: st,
        duration: et.diff(st),
        priority: 4,
        description: event.description,
        day: date2day(sd),
        store: store};
      return task;}

    function isNotAllDay(event){return event.start.date === undefined;}

    return function(id){
      var that = this;
      var svcPromise = $gclient.load('calendar', 'v3');
      this.id = id;
      var queryInput = {calendarId: this.id};

      this.query = function(params){
        return svcPromise
          .then(function(svc){
            var d = params.day;
            var startDate = dayOnly(d);
            var endDate = dayOnly(new Date(d.getTime()+oneDayMs));
            queryInput.timeMin = startDate.toISOString();
            queryInput.timeMax = endDate.toISOString();
            return svc.events.list(queryInput);})
          .then(function(r){
            if ( !r.items ) return [];
            return r.items.filter(isNotAllDay).map(
              function(r){return deserialize(that, r);});});
      };};
  }]);
