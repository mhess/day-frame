//= require modal
//= require task_services

angular.module('auth', ['bootstrapModal', 'tasks'])
.service('$auth',
  ['$http', '$rootScope', '$window', '$modals', '$tasks', '$q', 
   'remoteStore', 'Time', 
  function($http, $rootScope, $window, $modals, $tasks, $q, 
    remoteStore, Time, $cookieStore) {

    var that = this;

    function deserializeUserInfo(info){
      return {
        name: info.name,
        wake: new Time(info.wake),
        sleep: new Time(info.sleep),
        gcals: info.gcals};}

    function serializeUserInfo(info){
      return {
        name: info.name,
        wake: info.wake.minutes,
        sleep: info.sleep.minutes,
        gcals: info.gcals};}

    //FIXME: This probably doesn't belong here.
    this.logInTransition = function(){
      var deferred = $q.defer();
      $('.welcome').slideUp(1000,
        function(){
          $rootScope.$apply(function(){
            $tasks.removeStore('local');
            $tasks.addStore(remoteStore).changeDay();
            $rootScope.$broadcast('fixWidgetArea');
            $rootScope.welcome = false;});
            $rootScope.wake = that.user.wake;
            $rootScope.sleep = that.user.sleep;
            deferred.resolve();});
      return deferred.promise;}

    this.logInPath = '/users/sign_in.json'; //config.signInPath;
    this.registerPath = '/users.json'; //config.registerPath;
    this.signOutPath = '/users/sign_out';
    this.forgotPath = '/users/password.json';
    this.user = null;

    var postData = {
        remote: true,
        commit: null,
        utf8: "✓",
        user: null};

    this.init = function(userInfo){
      if ( userInfo ) {
        this.user = deserializeUserInfo(userInfo);
        $tasks.addStore(remoteStore, true);}
      else $tasks.addStore(localStore, true);
    };

    this.logIn = function(fields) {
      fields.rem = fields.rem ? 1 : 0;
      postData.user = {
        email: fields.email, 
        password: fields.passwd, 
        remember: fields.rem};
      postData.commit = "Sign in";
      return $http.post(this.logInPath, postData)
        .then(
          function(resp){
            that.user = deserializeUserInfo(resp.data);
            return resp.data;},
          function(resp){return $q.reject(resp.data);});};

    this.signUp = function(usr){
      postData.user = usr;
      postData.user.password = usr.passwd;
      postData.user.password_confirmation = usr.passwdCnf;
      postData.commit = "Sign up";
      return $http.post(this.registerPath, postData)
        .then(
          function(resp){
            that.user = deserializeUserInfo(resp.data);
            return resp.data;},
          function(resp){
            return $q.reject(resp.data.errors);});};

    this.logOut = function(){
      return $http.delete(that.signOutPath);};

    this.update = function(usr){
      postData.commit = "Update";
      postData.user = serializeUserInfo(usr);
      return $http.put(this.registerPath, postData)
        .then(
          function(resp){
            angular.extend(that.user, resp.data);
            return resp.data;},
          function(resp){
            return $q.reject(resp.data.errors);});};

    this.forgot = function(email){
      postData.commit = 'Send me reset password instructions';
      postData.user = {email: email};
      return $http.post(this.forgotPath, postData)
        .then(
          function(resp){return resp.data;},
          function(resp){return $q.reject(resp.data.errors);});};

    this.unauthenticated = function(){
      // return $modals.logIn()
      //   .catch(function(){window.location.reload();});
      };
  }]);