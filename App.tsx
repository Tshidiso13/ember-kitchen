import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api, clearSession, restoreUser, signIn, signUp, User } from "./src/api";

type Category = { id: string; name: string };
type Dish = {
  id: string;
  name: string;
  description: string;
  price: string | number;
  imageUrl: string;
  tag?: string | null;
  allergens?: string | null;
  extraName?: string | null;
  extraPrice: string | number;
  isFeatured: boolean;
  category: Category;
};
type RestaurantSettings = {
  restaurantName: string;
  phone?: string | null;
  address?: string | null;
  deliveryFee: string | number;
  minimumOrder: string | number;
  acceptingOrders: boolean;
};
type CartLine = { key: string; dish: Dish; quantity: number; extra: boolean; note: string };
type OrderItem = { id: string; menuItemId?: string | null; name: string; unitPrice: string | number; quantity: number; extraName?: string | null; extraPrice: string | number; note?: string | null };
type Order = { id: string; orderNumber: string; status: string; fulfillment: "DELIVERY" | "COLLECTION"; subtotal: string | number; deliveryFee: string | number; total: string | number; address?: string | null; createdAt: string; items: OrderItem[] };
type Tab = "Explore" | "Favourites" | "Orders" | "Profile";
type Sheet = "cart" | "checkout" | null;

const C = { ink: "#243D32", muted: "#7B827A", cream: "#F8F7F2", orange: "#D65A36", line: "#E8E9E1" };
const money = (amount: string | number) => `R${Number(amount).toFixed(2)}`;
const Icon = ({ name, color = C.ink, size = 23 }: { name: React.ComponentProps<typeof Ionicons>["name"]; color?: string; size?: number }) => <Ionicons name={name} size={size} color={color} />;

function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, disabled && { opacity: 0.45 }]}><Text style={s.buttonText}>{label}</Text><Icon name="arrow-forward" color="white" size={19}/></Pressable>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const user = mode === "login" ? await signIn(email.trim(), password) : await signUp(name.trim(), email.trim(), password);
      onAuthenticated(user);
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed"); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={s.safe}><StatusBar style="dark"/><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[s.app,{justifyContent:"center"}]}><ScrollView contentContainerStyle={[s.content,{flexGrow:1,justifyContent:"center"}]} keyboardShouldPersistTaps="handled">
    <View style={[s.logo,{width:56,height:60,borderRadius:20,marginBottom:20}]}><Icon name="flame" color="white" size={31}/></View>
    <Text style={s.eyebrow}>GOOD FOOD. GOOD MOOD.</Text><Text style={s.heading}>{mode === "login" ? "Welcome back." : "Join Ember Kitchen."}</Text>
    <Text style={[s.muted,{marginBottom:18}]}>{mode === "login" ? "Sign in to order, save favourites and follow your orders." : "Create your account to start ordering."}</Text>
    {mode === "register" && <TextInput style={s.input} placeholder="Full name" placeholderTextColor={C.muted} value={name} onChangeText={setName} autoCapitalize="words"/>}
    <TextInput style={s.input} placeholder="Email address" placeholderTextColor={C.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
    <TextInput style={s.input} placeholder="Password" placeholderTextColor={C.muted} value={password} onChangeText={setPassword} secureTextEntry/>
    {!!error && <Text accessibilityRole="alert" style={{color:"#B33323"}}>{error}</Text>}
    <Button label={busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} onPress={submit} disabled={busy || !email.trim() || password.length < 8 || (mode === "register" && name.trim().length < 2)}/>
    <Pressable onPress={()=>{setMode(mode === "login" ? "register" : "login");setError("");}} style={{paddingVertical:16,alignItems:"center"}}><Text style={s.link}>{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</Text></Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function AppContent() {
  const [user,setUser]=useState<User|null>(null); const [ready,setReady]=useState(false); const [busy,setBusy]=useState(false);
  const [menu,setMenu]=useState<Dish[]>([]); const [categories,setCategories]=useState<Category[]>([]); const [settings,setSettings]=useState<RestaurantSettings|null>(null);
  const [tab,setTab]=useState<Tab>("Explore"); const [category,setCategory]=useState("All"); const [search,setSearch]=useState("");
  const [favourites,setFavourites]=useState<string[]>([]); const [cart,setCart]=useState<CartLine[]>([]); const [orders,setOrders]=useState<Order[]>([]);
  const [selected,setSelected]=useState<Dish|null>(null); const [quantity,setQuantity]=useState(1); const [extra,setExtra]=useState(false); const [note,setNote]=useState("");
  const [sheet,setSheet]=useState<Sheet>(null); const [mode,setMode]=useState<"DELIVERY"|"COLLECTION">("DELIVERY");
  const [profileName,setProfileName]=useState(""); const [phone,setPhone]=useState(""); const [address,setAddress]=useState("");
  const [message,setMessage]=useState(""); const [error,setError]=useState("");

  const loadPublic = async () => {
    const [m,st] = await Promise.all([
      api<{categories:Category[];items:Dish[]}>("/menu"),
      api<RestaurantSettings>("/settings"),
    ]);
    setMenu(m.items); setCategories(m.categories); setSettings(st);
  };
  const loadPrivate = async (current:User) => {
    const [fav,ord,profile] = await Promise.all([
      api<Dish[]>("/favourites",{},true), api<Order[]>("/orders",{},true), api<User>("/users/me",{},true),
    ]);
    setFavourites(fav.map(x=>x.id)); setOrders(ord); setUser(profile); setProfileName(profile.name); setPhone(profile.phone || ""); setAddress(profile.address || "");
    const raw = await AsyncStorage.getItem(`ember-cart-v2:${current.id}`); setCart(raw ? JSON.parse(raw) : []);
  };
  useEffect(()=>{(async()=>{try{await loadPublic();const restored=await restoreUser();if(restored){setUser(restored);await loadPrivate(restored);}}catch(e){setError(e instanceof Error?e.message:"Could not connect to Ember Kitchen");}finally{setReady(true);}})();},[]);
  useEffect(()=>{if(user) AsyncStorage.setItem(`ember-cart-v2:${user.id}`,JSON.stringify(cart)).catch(()=>{});},[cart,user?.id]);
  useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(""),3500);return()=>clearTimeout(t);},[message]);
  useEffect(()=>{
    if(tab!=="Orders"||!user)return;
    const refreshOrders=()=>api<Order[]>("/orders",{},true).then(setOrders).catch(()=>{});
    refreshOrders();
    const timer=setInterval(refreshOrders,15000);
    return()=>clearInterval(timer);
  },[tab,user?.id]);
  useEffect(()=>{if(tab==="Explore"&&user)loadPublic().catch(()=>{});},[tab,user?.id]);

  const filtered = useMemo(()=>menu.filter(d=>(tab!=="Favourites"||favourites.includes(d.id))&&(category==="All"||d.category.name===category)&&(d.name+" "+d.description).toLowerCase().includes(search.toLowerCase())),[menu,tab,favourites,category,search]);
  const featured = menu.find(x=>x.isFeatured) || menu[0];
  const subtotal = cart.reduce((sum,l)=>sum+(Number(l.dish.price)+(l.extra?Number(l.dish.extraPrice):0))*l.quantity,0);
  const deliveryFee = mode === "DELIVERY" && cart.length ? Number(settings?.deliveryFee || 0) : 0;
  const total = subtotal + deliveryFee; const count = cart.reduce((sum,l)=>sum+l.quantity,0);

  const openDish=(dish:Dish)=>{setSelected(dish);setQuantity(1);setExtra(false);setNote("");};
  const add=()=>{if(!selected)return;const key=`${selected.id}:${extra}:${note.trim()}`;setCart(lines=>{const found=lines.find(x=>x.key===key);return found?lines.map(x=>x.key===key?{...x,quantity:x.quantity+quantity}:x):[...lines,{key,dish:selected,quantity,extra,note:note.trim()}];});setSelected(null);setMessage("Added to your basket.");};
  const change=(key:string,by:number)=>setCart(lines=>lines.map(l=>l.key===key?{...l,quantity:l.quantity+by}:l).filter(l=>l.quantity>0));
  const toggleFavourite=async(id:string)=>{const saved=favourites.includes(id);setFavourites(v=>saved?v.filter(x=>x!==id):[...v,id]);try{await api(`/favourites/${id}`,{method:saved?"DELETE":"POST"},true);}catch(e){setFavourites(v=>saved?[...v,id]:v.filter(x=>x!==id));setMessage(e instanceof Error?e.message:"Could not update favourite");}};
  const saveProfile=async()=>{setBusy(true);setError("");try{const p=await api<User>("/users/me",{method:"PATCH",body:JSON.stringify({name:profileName.trim(),phone:phone.trim(),address:address.trim()})},true);setUser(p);setMessage("Profile updated.");}catch(e){setError(e instanceof Error?e.message:"Could not update profile");}finally{setBusy(false);}};
  const place=async()=>{
    if(!profileName.trim()||phone.replace(/\D/g,"").length<10||(mode==="DELIVERY"&&address.trim().length<8)){setError("Enter your name, a valid phone number and a delivery address for delivery.");return;}
    if(!cart.length)return; setBusy(true);setError("");
    try{
      await api<User>("/users/me",{method:"PATCH",body:JSON.stringify({name:profileName.trim(),phone:phone.trim(),address:address.trim()})},true);
      const order=await api<Order>("/orders",{method:"POST",body:JSON.stringify({fulfillment:mode,address:mode==="DELIVERY"?address.trim():undefined,items:cart.map(l=>({menuItemId:l.dish.id,quantity:l.quantity,extra:l.extra,note:l.note||undefined}))})},true);
      setCart([]); setSheet(null); setTab("Orders"); setOrders(await api<Order[]>("/orders",{},true)); setMessage(`Order ${order.orderNumber} placed.`);
    }catch(e){setError(e instanceof Error?e.message:"Could not place your order");}finally{setBusy(false);}
  };
  const logout=async()=>{try{await api("/auth/logout",{method:"POST"},true);}catch{}await clearSession();setUser(null);setCart([]);setOrders([]);setFavourites([]);setTab("Explore");};
  const reorder=(order:Order)=>{const next:CartLine[]=[];order.items.forEach(i=>{const d=menu.find(m=>m.id===i.menuItemId);if(d)next.push({key:`${d.id}:${!!i.extraName}:${i.note||""}`,dish:d,quantity:i.quantity,extra:!!i.extraName,note:i.note||""});});if(!next.length){setMessage("Those items are no longer available.");return;}setCart(old=>[...old,...next]);setSheet("cart");};
  const stepper=(value:number,minus:()=>void,plus:()=>void)=><View style={s.stepper}><Pressable onPress={minus} style={s.step}><Icon name="remove" size={18}/></Pressable><Text style={s.bold}>{value}</Text><Pressable onPress={plus} style={s.step}><Icon name="add" size={18}/></Pressable></View>;
  const field=(placeholder:string,value:string,onChangeText:(v:string)=>void,phoneField=false)=><TextInput placeholder={placeholder} placeholderTextColor={C.muted} value={value} onChangeText={onChangeText} keyboardType={phoneField?"phone-pad":"default"} style={s.input}/>;

  if(!ready)return <View style={s.loading}><ActivityIndicator color={C.orange}/></View>;
  if(!user)return <AuthScreen onAuthenticated={async u=>{setUser(u);setReady(false);try{await loadPublic();await loadPrivate(u);}finally{setReady(true);}}}/>;

  return <SafeAreaView style={s.safe}><StatusBar style="dark"/><View style={s.app}>
    <View style={s.header}><View style={s.brand}><View style={s.logo}><Icon name="flame" color="white" size={25}/></View><View><Text style={s.brandName}>ember<Text style={{color:C.orange}}> kitchen</Text></Text><Text style={s.micro}>GOOD FOOD. GOOD MOOD.</Text></View></View><Pressable onPress={()=>setSheet("cart")} style={s.bag}><Icon name="bag-handle-outline"/>{count>0&&<View style={s.badge}><Text style={s.badgeText}>{count}</Text></View>}</Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {(tab==="Explore"||tab==="Favourites")&&<>
        <View style={s.between}><View><Text style={s.eyebrow}>{tab==="Explore"?"YOUR NEXT GOOD MEAL":"SAVED FOR LATER"}</Text><Text style={s.heading}>{tab==="Explore"?"What sounds good?":"Your favourites."}</Text></View><View style={s.smallPill}><View style={[s.dot,{backgroundColor:settings?.acceptingOrders?"#4E9B6E":"#B84C3D"}]}/><Text style={s.small}>{settings?.acceptingOrders?"Taking orders":"Orders paused"}</Text></View></View>
        <View style={s.search}><Icon name="search-outline" size={20}/><TextInput placeholder="Find your next favourite…" placeholderTextColor={C.muted} value={search} onChangeText={setSearch} style={s.searchInput}/>{!!search&&<Pressable onPress={()=>setSearch("")}><Icon name="close" size={18}/></Pressable>}</View>
        {tab==="Explore"&&!search&&featured&&<ImageBackground source={{uri:featured.imageUrl}} imageStyle={{borderRadius:24}} style={s.hero}><View style={s.heroShade}><Text style={s.heroEyebrow}>{featured.tag||"EMBER FAVOURITE"}</Text><Text style={s.heroTitle}>{featured.name}</Text><Text style={s.heroSub}>{featured.description}</Text><Pressable onPress={()=>openDish(featured)} style={s.heroButton}><Text style={s.bold}>View dish</Text><Icon name="arrow-forward" size={17}/></Pressable></View></ImageBackground>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>{["All",...categories.map(c=>c.name)].map(c=><Pressable key={c} onPress={()=>setCategory(c)} style={[s.chip,category===c&&s.chipActive]}><Text style={[s.chipText,category===c&&{color:"white"}]}>{c}</Text></Pressable>)}</ScrollView>
        <View style={s.between}><Text style={s.section}>{tab==="Favourites"?"Saved for you":category==="All"?"Menu":category}</Text><Text style={s.small}>{filtered.length} dishes</Text></View>
        <View style={s.grid}>{filtered.map(d=><View key={d.id} style={s.card}><Pressable onPress={()=>openDish(d)}><Image source={{uri:d.imageUrl}} style={s.food}/><View style={s.cardBody}><Text style={s.tag}>{d.tag||d.category.name.toUpperCase()}</Text><Text style={s.dishTitle}>{d.name}</Text><Text numberOfLines={2} style={s.small}>{d.description}</Text><View style={s.between}><Text style={s.price}>{money(d.price)}</Text><View style={s.add}><Icon name="add" color="white" size={20}/></View></View></View></Pressable><Pressable onPress={()=>toggleFavourite(d.id)} style={s.heart}><Icon name={favourites.includes(d.id)?"heart":"heart-outline"} color={favourites.includes(d.id)?C.orange:C.ink} size={19}/></Pressable></View>)}</View>
        {!filtered.length&&<View style={s.empty}><Icon name="restaurant-outline" size={42}/><Text style={s.section}>{tab==="Favourites"?"No favourites yet":"No dishes found"}</Text><Text style={s.muted}>{tab==="Favourites"?"Tap the heart on a dish to save it.":"Try another search or category."}</Text></View>}
      </>}
      {tab==="Orders"&&<><Text style={s.eyebrow}>YOUR ORDER HISTORY</Text><Text style={s.heading}>Your orders.</Text>{!orders.length?<View style={s.empty}><Icon name="receipt-outline" size={52}/><Text style={s.section}>Something delicious awaits.</Text><Text style={s.muted}>Your first order is just a few bites away.</Text><Button label="Explore the menu" onPress={()=>setTab("Explore")}/></View>:orders.map(o=><View key={o.id} style={s.order}><View style={s.between}><View><Text style={s.section}>{o.orderNumber}</Text><Text style={s.small}>{new Date(o.createdAt).toLocaleString()}</Text></View><View style={s.smallPill}><View style={s.dot}/><Text style={s.small}>{o.status.replaceAll("_"," ")}</Text></View></View>{o.items.map(i=><View key={i.id} style={s.orderLine}><Text style={s.muted}>{i.quantity} × {i.name}{i.extraName?` + ${i.extraName}`:""}</Text><Text style={s.bold}>{money((Number(i.unitPrice)+Number(i.extraPrice))*i.quantity)}</Text></View>)}<View style={s.between}><Text style={s.price}>{money(o.total)}</Text><Pressable onPress={()=>reorder(o)}><Text style={s.link}>Order again →</Text></Pressable></View></View>)}</>}
      {tab==="Profile"&&<><Text style={s.eyebrow}>YOUR ACCOUNT</Text><Text style={s.heading}>Your details.</Text><View style={s.profileAvatar}><Icon name="person-outline" size={34}/></View><Text style={s.section}>{user.name}</Text><Text style={s.muted}>{user.email}</Text>{field("Full name",profileName,setProfileName)}{field("Phone number",phone,setPhone,true)}{field("Delivery address",address,setAddress)}{!!error&&<Text style={{color:"#B33323"}}>{error}</Text>}<Button label={busy?"Saving…":"Save profile"} onPress={saveProfile} disabled={busy}/><View style={s.info}><Text style={s.bold}>Ember Kitchen</Text><Text style={s.muted}>{settings?.address||"Collection address will appear here once configured by the restaurant."}</Text>{settings?.phone&&<Text style={s.muted}>{settings.phone}</Text>}</View><Pressable onPress={logout} style={[s.button,{backgroundColor:"#EFEFE7"}]}><Text style={[s.buttonText,{color:C.ink}]}>Sign out</Text><Icon name="log-out-outline"/></Pressable></>}
    </ScrollView>
    {count>0&&<Pressable onPress={()=>setSheet("cart")} style={s.cartBar}><View style={s.cartCount}><Text style={s.buttonText}>{count}</Text></View><Text style={[s.buttonText,{flex:1}]}>View your basket</Text><Text style={s.buttonText}>{money(subtotal)}</Text><Icon name="arrow-forward" color="white" size={18}/></Pressable>}
    <View style={s.nav}>{(["Explore","Favourites","Orders","Profile"] as Tab[]).map((t,i)=><Pressable key={t} onPress={()=>{setTab(t);setSearch("");setCategory("All");setError("");}} style={s.navItem}><Icon name={(["restaurant-outline","heart-outline","receipt-outline","person-outline"] as const)[i]} color={tab===t?C.orange:C.muted} size={22}/><Text style={[s.navLabel,tab===t&&{color:C.orange}]}>{t}</Text>{tab===t&&<View style={s.navDot}/>}</Pressable>)}</View>
    {!!message&&<View style={s.toast}><Text style={{color:"white",textAlign:"center"}}>{message}</Text></View>}
    <Modal visible={!!selected||!!sheet} animationType="slide" onRequestClose={()=>{setSelected(null);setSheet(null);setError("");}}><SafeAreaView style={s.safe}><KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={s.app}><View style={s.modalHeader}><Pressable onPress={()=>{if(sheet==="checkout")setSheet("cart");else{setSelected(null);setSheet(null);}setError("");}} style={s.bag}><Icon name="arrow-back"/></Pressable><Text style={s.section}>{selected?"Made with care":sheet==="cart"?"Your basket":"Checkout"}</Text><View style={{width:42}}/></View><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {selected&&<><Image source={{uri:selected.imageUrl}} style={s.detailImage}/><Text style={s.tag}>{selected.tag||selected.category.name.toUpperCase()}</Text><Text style={s.heading}>{selected.name}</Text><Text style={s.price}>{money(selected.price)}</Text><Text style={s.description}>{selected.description}</Text>{selected.allergens&&<View style={s.info}><Text style={s.bold}>Allergen information</Text><Text style={s.muted}>{selected.allergens}. Confirm with the restaurant if you have a serious allergy.</Text></View>}{selected.extraName&&Number(selected.extraPrice)>0&&<><Text style={s.section}>Make it yours</Text><Pressable onPress={()=>setExtra(!extra)} style={s.option}><Icon name={extra?"checkbox":"square-outline"} color={C.orange}/><Text style={{flex:1,color:C.ink}}>Extra {selected.extraName}</Text><Text style={s.bold}>+ {money(selected.extraPrice)}</Text></Pressable></>}<TextInput style={[s.input,{minHeight:80}]} placeholder="Any special requests? (optional)" value={note} onChangeText={setNote} multiline maxLength={160}/><View style={s.between}><Text style={s.bold}>Quantity</Text>{stepper(quantity,()=>setQuantity(Math.max(1,quantity-1)),()=>setQuantity(Math.min(20,quantity+1)))}</View><Button label={`Add to basket · ${money((Number(selected.price)+(extra?Number(selected.extraPrice):0))*quantity)}`} onPress={add}/></>}
      {sheet==="cart"&&<>{!cart.length?<View style={s.empty}><Icon name="bag-handle-outline" size={50}/><Text style={s.section}>Your basket is feeling hungry.</Text><Button label="Find something delicious" onPress={()=>{setSheet(null);setTab("Explore");}}/></View>:<>{cart.map(l=><View key={l.key} style={s.cartLine}><Image source={{uri:l.dish.imageUrl}} style={s.thumb}/><View style={{flex:1,gap:6}}><Text style={s.bold}>{l.dish.name}</Text>{l.extra&&<Text style={s.small}>With extra {l.dish.extraName}</Text>}{!!l.note&&<Text style={s.small}>{l.note}</Text>}<Text style={s.price}>{money((Number(l.dish.price)+(l.extra?Number(l.dish.extraPrice):0))*l.quantity)}</Text>{stepper(l.quantity,()=>change(l.key,-1),()=>change(l.key,1))}</View><Pressable onPress={()=>setCart(c=>c.filter(x=>x.key!==l.key))}><Icon name="trash-outline" size={18}/></Pressable></View>)}<View style={s.between}><Text style={s.section}>Subtotal</Text><Text style={s.price}>{money(subtotal)}</Text></View><Text style={s.muted}>Delivery {Number(settings?.deliveryFee||0)>0?`is ${money(settings?.deliveryFee||0)}`:"is free"}. Collection is free.</Text><Button label="Continue to checkout" onPress={()=>{setError("");setSheet("checkout");}} disabled={!settings?.acceptingOrders}/>{!settings?.acceptingOrders&&<Text style={{color:"#B33323"}}>The restaurant is currently not accepting orders.</Text>}</>}</>}
      {sheet==="checkout"&&<><Text style={s.heading}>Nearly at the table.</Text><View style={s.modeRow}>{(["DELIVERY","COLLECTION"] as const).map(m=><Pressable key={m} onPress={()=>setMode(m)} style={[s.chip,{flex:1,alignItems:"center"},mode===m&&s.chipActive]}><Text style={[s.chipText,mode===m&&{color:"white"}]}>{m==="DELIVERY"?"Delivery":"Collection"}</Text></Pressable>)}</View><Text style={s.section}>Contact details</Text>{field("Full name",profileName,setProfileName)}{field("Phone number",phone,setPhone,true)}{mode==="DELIVERY"?field("Street address, suburb and postal code",address,setAddress):<View style={s.info}><Text style={s.bold}>Collect from {settings?.restaurantName||"Ember Kitchen"}</Text><Text style={s.muted}>{settings?.address||"The restaurant has not configured a collection address yet."}</Text></View>}<Text style={s.section}>Order summary</Text><View style={s.between}><Text style={s.muted}>Food ({count} items)</Text><Text style={s.bold}>{money(subtotal)}</Text></View><View style={s.between}><Text style={s.muted}>{mode==="DELIVERY"?"Delivery":"Collection"}</Text><Text style={s.bold}>{deliveryFee?money(deliveryFee):"Free"}</Text></View><View style={[s.between,s.total]}><Text style={s.section}>Total</Text><Text style={s.price}>{money(total)}</Text></View><View style={s.info}><Text style={s.bold}>Payment on {mode==="DELIVERY"?"delivery":"collection"}</Text><Text style={s.muted}>The backend recalculates menu prices and delivery fees before accepting the order.</Text></View>{!!error&&<Text accessibilityRole="alert" style={{color:"#B33323"}}>{error}</Text>}<Button label={busy?"Placing order…":`Place order · ${money(total)}`} onPress={place} disabled={busy||!cart.length||!settings?.acceptingOrders}/></>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>
  </View></SafeAreaView>;
}

export default function App(){return <SafeAreaProvider><AppContent/></SafeAreaProvider>}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  app: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  brand: { flexDirection: "row", gap: 10, alignItems: "center" },
  logo: {
    width: 40,
    height: 44,
    borderRadius: 15,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 20,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.8,
  },
  micro: { fontSize: 8, letterSpacing: 1.9, color: C.muted, marginTop: 4 },
  bag: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#EFEFE7",
  },
  badge: {
    position: "absolute",
    right: -3,
    top: -3,
    borderRadius: 12,
    backgroundColor: C.orange,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  content: { padding: 22, gap: 18, paddingBottom: 32 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: C.orange,
    marginBottom: 7,
  },
  heading: { fontSize: 29, fontWeight: "800", color: C.ink, letterSpacing: -1 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  smallPill: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#678363" },
  small: { fontSize: 11, color: C.muted, lineHeight: 17 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 51,
    gap: 10,
    borderWidth: 1,
    borderColor: C.line,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.ink, height: "100%" },
  hero: { height: 230, borderRadius: 24, overflow: "hidden" },
  heroShade: {
    flex: 1,
    backgroundColor: "rgba(15,25,17,.49)",
    padding: 24,
    alignItems: "flex-start",
  },
  heroEyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: "#F6D9B6",
  },
  heroTitle: {
    fontSize: 35,
    lineHeight: 38,
    fontWeight: "800",
    color: "#FFF9EE",
    marginTop: 10,
    letterSpacing: -1,
  },
  heroSub: { color: "#FFF2E5", fontSize: 11, marginTop: 8 },
  heroButton: {
    backgroundColor: "#FFF8E8",
    borderRadius: 25,
    paddingHorizontal: 17,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 17,
  },
  bold: { fontSize: 13, fontWeight: "700", color: C.ink },
  categories: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 23,
    backgroundColor: "#EEEFE7",
  },
  chipActive: { backgroundColor: C.ink },
  chipText: { fontSize: 12, fontWeight: "600", color: C.ink },
  section: {
    fontSize: 19,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  card: {
    width: "47.8%",
    flexGrow: 1,
    maxWidth: "49%",
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    borderColor: C.line,
    borderWidth: 1,
  },
  food: { width: "100%", height: 145, backgroundColor: "#DEDCD1" },
  cardBody: { padding: 13, gap: 8 },
  tag: { fontSize: 8, fontWeight: "800", letterSpacing: 1, color: C.orange },
  dishTitle: { fontSize: 15, fontWeight: "700", color: C.ink, minHeight: 36 },
  rating: { flexDirection: "row", gap: 4, alignItems: "center" },
  price: { fontSize: 17, fontWeight: "800", color: C.ink },
  add: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  heart: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "rgba(255,255,255,.94)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerNote: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  nav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: C.line,
    backgroundColor: C.cream,
    paddingTop: 13,
    paddingBottom: 8,
  },
  navItem: { flex: 1, alignItems: "center", gap: 5 },
  navLabel: { fontSize: 10, color: C.muted, fontWeight: "600" },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.orange },
  cartBar: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    backgroundColor: C.ink,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cartCount: {
    backgroundColor: "#4A6255",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  button: {
    marginTop: 10,
    backgroundColor: C.orange,
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  buttonText: { color: "white", fontSize: 13, fontWeight: "700" },
  muted: { fontSize: 13, lineHeight: 21, color: C.muted },
  empty: { alignItems: "center", gap: 17, paddingVertical: 50 },
  order: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "white",
    gap: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  orderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  link: { fontSize: 13, color: C.orange, fontWeight: "700" },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8EBDC",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  input: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    color: C.ink,
    fontSize: 14,
    minHeight: 51,
  },
  info: { padding: 17, borderRadius: 16, backgroundColor: "#ECEFE5", gap: 8 },
  toast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: C.ink,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  detailImage: {
    height: 280,
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#DEDCD1",
  },
  description: { fontSize: 15, lineHeight: 25, color: C.muted },
  option: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "white",
    padding: 18,
    borderRadius: 15,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 17,
    alignSelf: "flex-start",
    borderRadius: 12,
    backgroundColor: "#EFEFE6",
  },
  step: { padding: 12 },
  cartLine: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  thumb: {
    width: 75,
    height: 85,
    borderRadius: 14,
    backgroundColor: "#DEDCD1",
  },
  modeRow: { flexDirection: "row", gap: 12 },
  total: { paddingTop: 17, borderTopWidth: 1, borderColor: C.line },
});
