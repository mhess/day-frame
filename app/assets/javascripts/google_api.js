// Global declaration necessary because of google api structure.
var googleClientLoad;

angular.module('google', [])
  .provider('$gclient', 
    function(){
      var url_base = 'https://apis.google.com/js/client.js'
      var load_param = '?onload=googleClientLoad';
      var url = url_base + load_param;
      var provider = this;
      this.config = function(apiKey, clientId){
        this.apiKey = apiKey;
        this.clientId = clientId;};
  
      var gclient = {};

      this.$get = ['$q', '$document', '$interval',
        function($q, $document, $interval){
          $document.find('body').append('<script src="'+url+'"></script>');
          var gapiDeferred = $q.defer();
          var gapiPromise = gapiDeferred.promise;
  
          googleClientLoad = function(){
            gapi.client.setApiKey(provider.apiKey);
            console.log('google loaded');
            gapiDeferred.resolve();};
  
          function authorize(scope){
            scope = 'https://www.googleapis.com/auth/'+scope;
            var d = $q.defer();
            gapiPromise.then(function(){
              var authOpts = {client_id: provider.clientId, scope: scope};
              gapi.auth.authorize(authOpts, 
                function(authResult){
                  if ( !authResult || authResult.error) return d.reject();
                  console.log(scope, 'authorized');
                  d.resolve();
                  authOpts.immediate = true;
                  $interval(function(){
                    gapi.auth.authorize(authOpts, function(){
                      console.log('auth refresh');});}, 
                    ((parseInt(authResult.expires_in, 10)/60)-1)*60000);});});
            return d.promise;}

          function load(svc, version){
            var d = $q.defer();
            gapiPromise.then(function(){
              gapi.client.load(svc, version, function(){
                var mySvc = gclient[svc] = {};
                var svcObj = gapi.client[svc];
                for ( var r in svcObj ) {
                  if ( !svcObj.hasOwnProperty(r) ) continue;
                  var resObj = svcObj[r];
                  var res = mySvc[r] = {};
                  for ( var m in resObj ) {
                    if ( !resObj.hasOwnProperty(m) ) continue;
                    (function(meth){
                      res[m] = function(){
                        var deferred = $q.defer();
                        var req = meth.apply(resObj, arguments);
                        req.execute(function(resp){
                          if ( 'error' in resp ) deferred.reject(resp.error);
                          else deferred.resolve(resp);});
                        return deferred.promise;};})(resObj[m]);}}
                console.log(svc, 'loaded');
                d.resolve(mySvc);});});
            return d.promise;}

          gclient.load = function(svc, version){
            if ( svc in this ) return $q.when(gclient[svc]);
            return authorize(svc).then(function(){
              return load(svc, version);});};

          return gclient;}];
  })