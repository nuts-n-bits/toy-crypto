
// bk for big K
const bk = new Uint32Array([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298])

// st for state
const st = new Uint32Array([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225])

const pp = function(msg : Uint8Array) : Array<Uint32Array> {       // pre pad

    // magic number 9 = 1 byte of 0x80 for the 1 bit + 8 bytes of long integer msg length.
    const bit_l = msg.length*8
    const padded_byte_length = (msg.length+9)%64 === 0 ? msg.length+9 : (((msg.length+9)/64)>>>0)*64+64

    const m = new Uint8Array(padded_byte_length)
    m.set(msg, 0)
    m.set([128], msg.length)
    m.set([((bit_l>>24)>>>0)&255, ((bit_l>>16)>>>0)&255, ((bit_l>>8)>>>0)&255, ((bit_l>>0)>>>0)&255], padded_byte_length-4)

    // separate into 64-byte blocks (chunks)
    const n : Array<Uint8Array> = []
    for(let i=0;i<m.length/64;i++) {
        n[i] = new Uint8Array(64)
        for(let j=0;j<64;j++) {
            n[i][j]=m[64*i+j]
        }
    }

    // divide 1 block into 16 * 32 bits of messages
    let p : Array<Uint32Array> = []
    for(let i=0;i<n.length;i++) {
        p[i] = new Uint32Array(16)
        for(let j=0;j<n[i].length/4;j++) {
            p[i][j]=((n[i][4*j]<<24)|(n[i][4*j+1]<<16)|(n[i][4*j+2]<<8)|(n[i][4*j+3]))
        }
    }
    return p
}

function ms(b : Uint32Array) : Uint32Array {         // message schedule for one message block

    const w = new Uint32Array(64)
    for(let i=0;i<16;i++) {
        w[i] = b[i]
    }
    for(let i=16;i<64;i++) {
        w[i] = pl(s1(w[i-2]),w[i-7],s0(w[i-15]),w[i-16])
    }
    return w
}

function cp (s : Uint32Array, w : Uint32Array) : void {       // side-effecty, will change s (state).

    let a=s[0], b=s[1], c=s[2], d=s[3], e=s[4], f=s[5], g=s[6], h=s[7]
    for(let x : number, y : number, i=0; i<64; i++) {

        x = pl(h,S1(e),ch(e,f,g),bk[i],w[i])
        y = pl(S0(a),mj(a,b,c))
        h = g
        g = f
        f = e
        e = pl(d,x)
        d = c
        c = b
        b = a
        a = pl(x,y)
    }
    s.set([pl(a,s[0]),pl(b,s[1]),pl(c,s[2]),pl(d,s[3]),pl(e,s[4]),pl(f,s[5]),pl(g,s[6]),pl(h,s[7])], 0)
}

function ml (msg : Uint8Array, st : Uint32Array) : Uint32Array {   // main loop, side-effecty, changes st.

    let m = pp(msg)
    for(let i=0;i<m.length;i++) { cp(st, ms(m[i])) }
    return st
}

function pl (a : number, b : number, c = 0, d = 0, e = 0) : number {  // safe addition
    return (((((((a+b)>>>0)+c)>>>0)+d)>>>0)+e)>>>0
}

function rt (a : number, b : number) : number {        // right rotate
    return ((a>>>b)|(a<<(32-b)))>>>0
}

function ch (x : number, y : number, z : number) : number {     // choice
    return ((x&y)^((~x)&z))>>>0
}

function mj (x : number, y : number, z : number) : number {     // majority
    return ((x&y)^(x&z)^(y&z))>>>0
}

function S0 (x : number) : number {         // Sigma 0
    return (rt(x,2)^rt(x,13)^rt(x,22))>>>0
}

function S1 (x : number) : number {         // Sigma 1
    return (rt(x,6)^rt(x,11)^rt(x,25))>>>0
}

function s0(x : number) : number {         // sigma 0

    return (rt(x,7)^rt(x,18)^(x>>>3))>>>0
}

function s1(x : number) : number {         // sigma 1

    return (rt(x,17)^rt(x,19)^(x>>>10))>>>0
}

function rg (a : Uint32Array) : Uint8Array {  // Uint32 to Uint8 

    let b = new Uint8Array(32)
    for(let i=0;i<8;i++) {
        b[i*4+0] = ((a[i]>>24)>>>0)&255
        b[i*4+1] = ((a[i]>>16)>>>0)&255
        b[i*4+2] = ((a[i]>>8)>>>0)&255
        b[i*4+3] = ((a[i]>>0)>>>0)&255
    }
    return b
}

export function sha256 (msg : Uint8Array) : Uint8Array {

    const st_copy = new Uint32Array(8)
    st_copy.set(st, 0)
    return rg(ml(msg, st_copy))
}

export const block_size = 64
export const output_size = 32
