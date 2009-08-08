// vi:ts=2 sw=2 expandtab

/**
 * Create a mockable and stubbable anonymous function.
 *
 * Once created, the function can be invoked and will return undefined
 * for any interactions that do not match stub declarations.
 *
 * <pre>
 * var mockFunc = JsMockito.mockFunction();
 * JsMockito.when(mockFunc).call(anything(), 1, 5).thenReturn(6);
 * mockFunc(1, 5); // result is 6
 * JsMockito.verify(mockFunc)(1, greaterThan(2));
 * </pre>
 *
 * @param mockName {string} The name of the mock function to use in messages
 *   (defaults to 'func')
 * @return {function} an anonymous function
 */
JsMockito.mockFunction = function(mockName) {
  mockName = mockName || 'func';

  var stubMatchers = []
  var interactions = [];

  var mockFunc = function() {
    var args = [this];
    args.push.apply(args, arguments);
    interactions.push(args);

    var stubMatcher = JsMockito.find(stubMatchers, function(stubMatcher) {
      return JsMockito.matchArray(stubMatcher[0], args);
    });
    if (stubMatcher == undefined)
      return undefined;
    var stubs = stubMatcher[1];
    if (stubs.length == 0)
      return undefined;
    var stub = stubs[0];
    if (stubs.length > 1)
      stubs.shift();
    return stub.apply(this, arguments);
  };

  mockFunc._jsMockitoStubBuilder = function(contextMatcher) {
    return matcherCaptureFunction(contextMatcher, function(matchers) {
      var stubMatch = [matchers, []];
      stubMatchers.push(stubMatch);
      return {
        then: function() {
          stubMatch[1].push.apply(stubMatch[1], arguments);
          return this;
        },
        thenReturn: function() {
          this.then.apply(this, JsMockito.map(arguments, function(value) {
            return function() { return value };
          }));
        },
        thenThrow: function(exception) {
          this.then.apply(this, JsMockito.map(arguments, function(value) {
            return function() { throw value };
          }));
        }
      };
    });
  };

  mockFunc._jsMockitoVerifier = function(contextMatcher, verifier) {
    return matcherCaptureFunction(contextMatcher, function(matchers) {
      return verifier(interactions, matchers, mockName, matchers[0] != contextMatcher);
    });
  };

  return mockFunc;

  function matcherCaptureFunction(contextMatcher, handler) {
    return JsMockito.contextCaptureFunction(contextMatcher,
      function(context, args) {
        var matchers = JsMockito.mapToMatchers([context].concat(args || []));
        return handler(matchers);
      }
    );
  };
};
