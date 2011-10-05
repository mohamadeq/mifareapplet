// Exception class
CardReaderException = function(err_type){
  var applet = CardReader.getApplet();

  errTypeToMsg = function(err_type){
    msg = '';
    switch(err_type){
      case applet.E_LENGTH_INCORRECT: msg = 'Length incorrect'; break;
      case applet.E_INVALID_INSTRUCTION_BYTE: msg = 'Invalid instruction byte'; break;
      case applet.E_CLASS_NOT_SUPPORTED: msg = 'Class not supported'; break;
      case applet.E_UNKNOWN_COMMAND: msg = 'Unknown command'; break;
      case applet.E_NO_INFORMATION_GIVEN: msg = 'No information given'; break;
      case applet.E_MEMORY_FAILURE: msg = 'Memory failure'; break;
      case applet.E_CLASS_BYTE_INCORRECT: msg = 'Class byte incorrect'; break;
      case applet.E_FUNCTION_NOT_SUPPORTED: msg = 'Function not supported'; break;
      case applet.E_WRONG_PARAMETER: msg = 'Wrong parameter'; break;
      default : msg = err_type;
    }
    return msg;
  };

  return {
    name    : 'CardReaderException',
    message : errTypeToMsg(err_type)
  }
}

// This class is used to read or write the whole card.
// To get it working, you have to first set the next parameters:
//      CardReader.setApplet(applet);
//      CardReader.setReader('The reader name');
//      CardReader.setProtocol('T=1');
CardReader = function(){
  var applet = null;
  var card = [];
  var keys = [];

  var reader = null;
  var protocol = null;

  throw_exception_if_error = function(r){
    if(!r.success) throw new CardReaderException(r.error);
    return r;
  };

  return {

    setApplet : function(app){
      applet = app;
    },

    getApplet : function(){
      return applet;
    },

    setReader : function(r){
      reader = r;
    },

    getReaders : function(){
      return $.parseJSON(applet.terminals());
    },

    setProtocol : function(p){
      protocol = p;
    },

    getCard : function(){
      return card;
    },

    setCard : function(blocks){
      card = blocks;
    },

    getKeys : function(){
      return keys;
    },

    setKeys : function(ks){
      keys = ks;
    },

    read : function(key_type){
      card = []; // Clean card
      try{
        applet.setTerminal(reader);
        applet.setProtocol(protocol);
            
        applet.beginTransaction();

        // Read blocks and load card
        $.each(keys, function(num_sector, k){
          for(var numBlock = 0; numBlock < 4; numBlock++){
            var n = (num_sector * 4) + numBlock;
            throw_exception_if_error(jQuery.parseJSON(applet.load_key(k, key_type.charCodeAt(0))));
            throw_exception_if_error(jQuery.parseJSON(applet.auth(n, key_type.charCodeAt(0))));
            r = throw_exception_if_error(jQuery.parseJSON(applet.read(n)));
            card.push(r.apdu.data);
          }
        });
        
      }catch(err){
        card = [];
        throw err;
      }finally{
        applet.endTransaction();
      }
    },

    write : function(key_type){
      try{
        applet.setTerminal(reader);
        applet.setProtocol(protocol);

        applet.beginTransaction();

        $.each(keys, function(num_sector, k){
          if(num_sector > 0){ // Jumping over 0 sector
            // Excludes access conditions blocks too
            for(var numBlock = 0; numBlock < 3; numBlock++){
              var n = (num_sector * 4) + numBlock;
              throw_exception_if_error(jQuery.parseJSON(applet.load_key(k, key_type.charCodeAt(0))));
              throw_exception_if_error(jQuery.parseJSON(applet.auth(n, key_type.charCodeAt(0))));
              throw_exception_if_error(jQuery.parseJSON(applet.write(n, card[n])));
              console.debug('Block:' + n);
            }
          }
        });
      }catch(err){
        throw err;
      }finally{
        applet.endTransaction();
      }
    },

    // Methods to load a card
    // A card is an array of byte arrays, one per block.
    // [ 
    //   [0x00, .. , 0x00],
    //   [0x00, .. , 0x00],
    //   ...
    // ]
    loadCardFromURL : function(url, success){
      var scope = this;
      $.getJSON(url, function(data){
        scope.setCard(data);
        success.call(this);
      });
    },

    // Methods to load keys
    // Keys are expected to be an array of byte arrays, one per sector.
    // [ 
    //   [0xff,0xff,0xff,0xff,0xff,0xff],
    //   [0xff,0xff,0xff,0xff,0xff,0xff],
    //   ...
    // ]
    loadKeysFromURL : function(url, success){
      var scope = this;
      $.getJSON(url, function(data){
        scope.setKeys(data);
        success.call(this);
      });
    },
    
    exportToString : function(){
      return card.map(function(b){
        return b.map(function(n){
          str = n.toString(16);
          return (str.length < 2 ? '0' : '') + str;
        }).join('');
      }).join('');
    }
  }
}();