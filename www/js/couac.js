'use strict;'

angular
    .module('couac', ['base64'])

    .service('couac',[
        '$http',
        function($http){
            var baseUrl = AppSettings.baseApiUrl;

            this.generateUrl = function(restEndPoint, params, format) {
                params = params?params:{};
                format = format?format:'json';

                var url = baseUrl;
                url    += restEndPoint;
                url    += "." + format;
                var first = true;

                for (key in params) {
                    var regExp = new RegExp("{" + key + "}");
                    var value = encodeURIComponent(params[key]);
                    if (url.match(regExp)) {
                        url = url.replace(regExp, value);
                    } else {
                        if (first) {
                            url += "?";
                            first = false;
                        } else {
                            url += "&";
                        }
                        url +=  key + "=" + value;
                    }
                }

                return url;
            }

        }]
    )

    .service('wsse', [
        '$base64',
        function($base64) {

            var hexcase = 0;
            var b64pad  = "=";
            var chrsz   = 8;

            /*
             * Calculate the SHA-1 of an array of big-endian words, and a bit length
             */
            function core_sha1(x, len)
            {
                /* append padding */
                x[len >> 5] |= 0x80 << (24 - len % 32);
                x[((len + 64 >> 9) << 4) + 15] = len;

                var w = Array(80);
                var a =  1732584193;
                var b = -271733879;
                var c = -1732584194;
                var d =  271733878;
                var e = -1009589776;

                for(var i = 0; i < x.length; i += 16)
                {
                    var olda = a;
                    var oldb = b;
                    var oldc = c;
                    var oldd = d;
                    var olde = e;

                    for(var j = 0; j < 80; j++)
                    {
                        if(j < 16) w[j] = x[i + j];
                        else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
                        var t = safe_add(
                                    safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                                    safe_add(safe_add(e, w[j]), sha1_kt(j))
                                );
                        e = d;
                        d = c;
                        c = rol(b, 30);
                        b = a;
                        a = t;
                    }

                    a = safe_add(a, olda);
                    b = safe_add(b, oldb);
                    c = safe_add(c, oldc);
                    d = safe_add(d, oldd);
                    e = safe_add(e, olde);
                }

                return Array(a, b, c, d, e);
            }

            /*
             * Bitwise rotate a 32-bit number to the left.
             */
            function rol(num, cnt)
            {
              return (num << cnt) | (num >>> (32 - cnt));
            }

            /*
             * Perform the appropriate triplet combination function for the current
             * iteration
             */
            function sha1_ft(t, b, c, d)
            {
                if(t < 20) return (b & c) | ((~b) & d);
                if(t < 40) return b ^ c ^ d;
                if(t < 60) return (b & c) | (b & d) | (c & d);
                return b ^ c ^ d;
            }

            /*
             * Determine the appropriate additive constant for the current iteration
             */
            function sha1_kt(t)
            {
                return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
                       (t < 60) ? -1894007588 : -899497514;
            }


            /*
             * Add integers, wrapping at 2^32. This uses 16-bit operations internally
             * to work around bugs in some JS interpreters.
             */
            function safe_add(x, y)
            {
                var lsw = (x & 0xFFFF) + (y & 0xFFFF);
                var msw = (x >> 16) + (y >> 16) + (lsw >> 16);

                return (msw << 16) | (lsw & 0xFFFF);
            }

            /*
             * Convert  an array of big-endian words to an 8-bit or 16-bit string
             */
            function binb2hex(binarray)
            {
              var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
              var str = "";
              for(var i = 0; i < binarray.length * 4; i++)
              {
                str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
                       hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
              }
              return str;
            }

            /*
             * Convert  an array of big-endian words to an 8-bit or 16-bit string
             */
            function binb2str(bin)
            {
              var str = "";
              var mask = (1 << chrsz) - 1;
              for(var i = 0; i < bin.length * 32; i += chrsz)
                str += String.fromCharCode((bin[i>>5] >>> (24 - i%32)) & mask);
              return str;
            }

            /*
             * Convert an 8-bit or 16-bit string to an array of big-endian words
             * In 8-bit function, characters >255 have their hi-byte silently ignored.
             */
            function str2binb(str)
            {
                var bin = Array();
                var mask = (1 << chrsz) - 1;
                for(var i = 0; i < str.length * chrsz; i += chrsz)
                    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
                return bin;
            }


            /*
             * Convert an array of big-endian words to a base-64 string
             */
            function binb2b64(binarray)
            {
                var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                var str = "";
                for(var i = 0; i < binarray.length * 4; i += 3)
                {
                    var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
                                | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 )
                                |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
                    for(var j = 0; j < 4; j++)
                    {
                        if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
                        else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
                    }
                }
                return str;
            }

            this.generateNonce = function(length) {
                var nonceChars = "0123456789abcdef";
                var result = "";
                for (var i = 0; i < length; i++) {
                    result += nonceChars.charAt(Math.floor(Math.random() * nonceChars.length));
                }
                return result;
            }

            this.getDate = function(date) {
                var yyyy = date.getUTCFullYear();
                var mm = (date.getUTCMonth() + 1);
                if (mm < 10) mm = "0" + mm;
                var dd = (date.getUTCDate());
                if (dd < 10) dd = "0" + dd;
                var hh = (date.getUTCHours());
                if (hh < 10) hh = "0" + hh;
                var mn = (date.getUTCMinutes());
                if (mn < 10) mn = "0" + mn;
                var ss = (date.getUTCSeconds());
                if (ss < 10) ss = "0" + ss;
                return yyyy+"-"+mm+"-"+dd+"T"+hh+":"+mn+":"+ss+"Z";
            }

            this.base64encode = function(nonce) {
                return $base64.encode(nonce);
            }

            this.getDigest = function(nonce, created, password) {
                var s = nonce + created + password;
                var sha1 = core_sha1(str2binb(s),s.length * chrsz);

                return binb2b64(sha1);
            }

            this.sha1 = function(s) {
                return binb2hex(core_sha1(str2binb(s),s.length * chrsz));
            }

            this.getHeaderValue = function(username, password) {

                var nonce           = this.generateNonce(16);
                var created         = this.getDate(new Date());
                var nonce64         = this.base64encode(nonce);
                var passwordDigest  = this.getDigest(nonce, created, password);

                var header = "UsernameToken Username=\""
                + username + "\", PasswordDigest=\""
                + passwordDigest + "\", Nonce=\""
                + nonce64 + "\", Created=\""
                + created + "\"";

                return header;
            }

        }
    ]);