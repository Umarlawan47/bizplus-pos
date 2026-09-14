const { supabase: dbClient, configured } = BizPlus;
if (!configured) {
  alert("BizPlus is not configured. Add your Supabase URL and Publishable Key in supabase.js.");
  location.href = "index.html";
}

const state = { user:null, profile:null, products:[], customers:[], sales:[], expenses:[], tickets:[], cart:[], currency:"NGN" };
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat("en-NG",{style:"currency",currency:state.currency,maximumFractionDigits:2}).format(Number(value||0));
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const toast = (message,error=false) => { const t=$("toast"); t.textContent=message; t.className=`toast show${error?" error":""}`; setTimeout(()=>t.className="toast",2500); };

async function init(){
  const {data:{session}} = await dbClient.auth.getSession();
  if(!session){ location.href="index.html"; return; }
  state.user=session.user;
  await loadProfile();
  await Promise.all([loadProducts(),loadCustomers(),loadSales(),loadExpenses(),loadTickets()]);
  bindNavigation();
  bindActions();
  renderAll();
}
async function loadProfile(){
  const {data,error}=await dbClient.from("profiles").select("*").eq("id",state.user.id).single();
  if(error && error.code!=="PGRST116") console.error(error);
  state.profile=data || {id:state.user.id,full_name:state.user.user_metadata?.full_name||"",business_name:state.user.user_metadata?.business_name||"BizPlus",currency:"NGN"};
  state.currency=state.profile.currency||"NGN";
  $("businessName").textContent=state.profile.business_name||"BizPlus";
  $("welcomeText").textContent=`Welcome, ${state.profile.full_name||"there"}`;
  $("settingsName").value=state.profile.full_name||"";
  $("settingsBusiness").value=state.profile.business_name||"";
  $("settingsPhone").value=state.profile.phone||"";
  $("settingsAddress").value=state.profile.address||"";
  $("settingsCurrency").value=state.currency;
}
async function loadProducts(){ const {data,error}=await dbClient.from("products").select("*").order("created_at",{ascending:false}); if(error) toast(error.message,true); state.products=data||[]; }
async function loadCustomers(){ const {data,error}=await dbClient.from("customers").select("*").order("name"); if(error) toast(error.message,true); state.customers=data||[]; }
async function loadSales(){ const {data,error}=await dbClient.from("sales").select("*,sale_items(*)").order("created_at",{ascending:false}); if(error) toast(error.message,true); state.sales=data||[]; }
async function loadExpenses(){ const {data,error}=await dbClient.from("expenses").select("*").order("created_at",{ascending:false}); if(error) toast(error.message,true); state.expenses=data||[]; }
async function loadTickets(){ const {data,error}=await dbClient.from("support_tickets").select("*").order("created_at",{ascending:false}); if(error) console.error(error); state.tickets=data||[]; }

function dateStart(period){
  const d=new Date(); d.setHours(0,0,0,0);
  if(period==="week"){ const day=d.getDay(); d.setDate(d.getDate()-(day===0?6:day-1)); }
  if(period==="month") d.setDate(1);
  if(period==="year"){ d.setMonth(0,1); }
  return d;
}
function totals(period){
  const start=dateStart(period);
  const sales=state.sales.filter(s=>new Date(s.created_at)>=start);
  const saleTotal=sales.reduce((a,s)=>a+Number(s.total),0);
  const profit=sales.reduce((a,s)=>a+Number(s.profit||0),0);
  return {sales:saleTotal,profit,orders:sales.length};
}
function renderDashboard(){
  const periods=[["todaySales","todayProfit","today"],["weekSales","weekProfit","week"],["monthSales","monthProfit","month"],["yearSales","yearProfit","year"]];
  periods.forEach(([a,b,p])=>{const t=totals(p==="today"?"today":p); $(a).textContent=money(t.sales); $(b).textContent=money(t.profit);});
  renderChart("week"); renderLowStock(); renderRecentSales();
}
function renderChart(range){
  const now=new Date(), values=[];
  if(range==="week"){
    for(let i=6;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const next=new Date(d);next.setDate(next.getDate()+1);values.push({label:d.toLocaleDateString("en",{weekday:"short"}),value:state.sales.filter(s=>new Date(s.created_at)>=d&&new Date(s.created_at)<next).reduce((a,s)=>a+Number(s.total),0)});}
  } else if(range==="month"){
    for(let i=29;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const next=new Date(d);next.setDate(next.getDate()+1);values.push({label:d.getDate(),value:state.sales.filter(s=>new Date(s.created_at)>=d&&new Date(s.created_at)<next).reduce((a,s)=>a+Number(s.total),0)});}
  } else {
    for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const next=new Date(d.getFullYear(),d.getMonth()+1,1);values.push({label:d.toLocaleDateString("en",{month:"short"}),value:state.sales.filter(s=>new Date(s.created_at)>=d&&new Date(s.created_at)<next).reduce((a,s)=>a+Number(s.total),0)});}
  }
  const max=Math.max(...values.map(v=>v.value),1);
  $("salesChart").innerHTML=values.map(v=>`<div class="bar" title="${money(v.value)}" style="height:${Math.max(5,v.value/max*190)}px"><span>${v.label}</span></div>`).join("");
}
function renderLowStock(){
  const low=state.products.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold||5));
  $("lowStockList").innerHTML=low.length?low.slice(0,8).map(p=>`<div class="ticket-head" style="padding:9px 0;border-bottom:1px solid var(--border)"><span>${esc(p.name)}</span><strong class="${p.stock===0?'red':'green'}">${p.stock}</strong></div>`).join(""):`<div class="empty">All stock levels look good.</div>`;
}
function renderRecentSales(){
  $("recentSales").innerHTML=state.sales.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Order</th><th>Total</th><th>Profit</th></tr></thead><tbody>${state.sales.slice(0,8).map(s=>`<tr><td>${new Date(s.created_at).toLocaleString()}</td><td>${esc(s.invoice_no)}</td><td>${money(s.total)}</td><td class="green">${money(s.profit)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No sales yet.</div>`;
}
function renderProducts(filter=""){
  const list=state.products.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())||String(p.sku||"").toLowerCase().includes(filter.toLowerCase()));
  $("productsTable").innerHTML=list.length?`<div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Cost</th><th>Stock</th><th></th></tr></thead><tbody>${list.map(p=>`<tr><td><strong>${esc(p.name)}</strong><br><span class="muted">${esc(p.category||"Uncategorized")}</span></td><td>${esc(p.sku||"-")}</td><td>${money(p.selling_price)}</td><td>${money(p.cost_price)}</td><td>${p.stock}</td><td><button class="text-btn edit-product" data-id="${p.id}">Edit</button> <button class="text-btn delete-product red" data-id="${p.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No products found.</div>`;
}
function renderInventory(){
  $("inventoryTable").innerHTML=`<div class="table-wrap"><table><thead><tr><th>Product</th><th>Stock</th><th>Threshold</th><th>Status</th></tr></thead><tbody>${state.products.map(p=>{const low=Number(p.stock)<=Number(p.low_stock_threshold||5);return `<tr><td>${esc(p.name)}</td><td>${p.stock}</td><td>${p.low_stock_threshold||5}</td><td><span class="badge ${low?'low':'ok'}">${p.stock==0?'Out of stock':low?'Low stock':'Healthy'}</span></td></tr>`}).join("")}</tbody></table></div>`;
}
function renderCustomers(filter=""){
  const list=state.customers.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase())||String(c.phone||"").includes(filter));
  $("customersTable").innerHTML=list.length?`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr></thead><tbody>${list.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone||"-")}</td><td>${esc(c.email||"-")}</td><td>${esc(c.address||"-")}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No customers found.</div>`;
}
function renderExpenses(){
  $("expensesTable").innerHTML=state.expenses.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th></tr></thead><tbody>${state.expenses.map(e=>`<tr><td>${new Date(e.created_at).toLocaleDateString()}</td><td>${esc(e.category)}</td><td>${money(e.amount)}</td><td>${esc(e.note||"-")}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No expenses recorded.</div>`;
}
function renderPOS(){
  const q=$("posSearch").value.toLowerCase(),cat=$("posCategory").value;
  const list=state.products.filter(p=>(!q||p.name.toLowerCase().includes(q)||String(p.sku||"").toLowerCase().includes(q))&&(!cat||p.category===cat));
  $("posProducts").innerHTML=list.map(p=>`<button class="product-tile" data-product="${p.id}"><strong>${esc(p.name)}</strong><small>${esc(p.category||"Other")} · ${money(p.selling_price)}</small><div style="margin-top:8px;font-weight:800">Stock: ${p.stock}</div></button>`).join("")||`<div class="empty">No products.</div>`;
  const cats=[...new Set(state.products.map(p=>p.category).filter(Boolean))]; $("posCategory").innerHTML=`<option value="">All categories</option>`+cats.map(c=>`<option>${esc(c)}</option>`).join("");
  renderCart();
}
function renderCart(){
  $("cart").innerHTML=state.cart.length?state.cart.map(item=>`<div class="cart-row"><div><strong>${esc(item.name)}</strong><br><small>${money(item.price)} × ${item.quantity}</small></div><div class="qty"><button data-cart-minus="${item.id}">−</button><span>${item.quantity}</span><button data-cart-plus="${item.id}">+</button></div><strong>${money(item.price*item.quantity)}</strong></div>`).join(""):`<div class="empty">Cart is empty.</div>`;
  const subtotal=state.cart.reduce((a,i)=>a+i.price*i.quantity,0),discount=Number($("saleDiscount").value||0);
  $("cartSubtotal").textContent=money(subtotal);$("cartTotal").textContent=money(Math.max(0,subtotal-discount));
  $("saleCustomer").innerHTML=`<option value="">Walk-in customer</option>`+state.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
}
function renderTickets(){ $("ticketsList").innerHTML=state.tickets.length?state.tickets.map(t=>`<div class="ticket"><div class="ticket-head"><strong>${esc(t.subject)}</strong><span class="badge">${esc(t.status)}</span></div><p>${esc(t.message)}</p><small class="muted">${new Date(t.created_at).toLocaleString()}</small></div>`).join(""):`<div class="empty">No support tickets.</div>`; }
function renderAll(){renderDashboard();renderProducts();renderInventory();renderCustomers();renderExpenses();renderPOS();renderTickets();}

function bindNavigation(){
  document.querySelectorAll(".nav button").forEach(btn=>btn.onclick=()=>showPage(btn.dataset.page));
  document.querySelectorAll("[data-page-link]").forEach(btn=>btn.onclick=()=>showPage(btn.dataset.pageLink));
}
function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $(`page-${page}`).classList.add("active");
  document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("pageTitle").textContent=page==="pos"?"Point of Sale":page==="support"?"Customer Care":page[0].toUpperCase()+page.slice(1);
}
function openModal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.add("open")}
function closeModal(){$("modal").classList.remove("open")}
function productForm(p={}){
 return `<form id="productForm" class="form-grid">
 <label>Product name<input name="name" required value="${esc(p.name||"")}"></label>
 <label>SKU<input name="sku" value="${esc(p.sku||"")}"></label>
 <label>Category<input name="category" value="${esc(p.category||"")}"></label>
 <label>Selling price<input name="selling_price" type="number" min="0" step=".01" required value="${p.selling_price||""}"></label>
 <label>Cost price<input name="cost_price" type="number" min="0" step=".01" required value="${p.cost_price||""}"></label>
 <label>Stock<input name="stock" type="number" min="0" required value="${p.stock??0}"></label>
 <label>Low-stock threshold<input name="low_stock_threshold" type="number" min="0" value="${p.low_stock_threshold??5}"></label>
 <label class="wide">Description<textarea name="description" rows="3">${esc(p.description||"")}</textarea></label>
 <button class="primary-btn" type="submit">${p.id?"Save Changes":"Add Product"}</button></form>`;
}
async function saveProduct(form,id){
 const data=Object.fromEntries(new FormData(form));["selling_price","cost_price","stock","low_stock_threshold"].forEach(k=>data[k]=Number(data[k]||0));data.updated_at=new Date().toISOString();
 const result=id?await dbClient.from("products").update(data).eq("id",id):await dbClient.from("products").insert({...data,user_id:state.user.id});
 if(result.error) return toast(result.error.message,true);
 closeModal();await loadProducts();renderAll();toast(id?"Product updated":"Product added");
}
async function deleteProduct(id){if(!confirm("Delete this product?"))return;const {error}=await dbClient.from("products").delete().eq("id",id);if(error)return toast(error.message,true);await loadProducts();renderAll();toast("Product deleted");}

function bindActions(){
  $("logoutBtn").onclick=async()=>{await dbClient.auth.signOut();location.href="index.html"};
  $("addProductBtn").onclick=()=>{openModal("Add Product",productForm());$("productForm").onsubmit=e=>{e.preventDefault();saveProduct(e.currentTarget)}};
  $("productSearch").oninput=e=>renderProducts(e.target.value);
  $("posSearch").oninput=renderPOS;$("posCategory").onchange=renderPOS;$("saleDiscount").oninput=renderCart;
  $("clearCart").onclick=()=>{state.cart=[];renderCart()};
  $("refreshInventory").onclick=async()=>{await loadProducts();renderInventory();};
  $("customerSearch").oninput=e=>renderCustomers(e.target.value);
  $("addCustomerBtn").onclick=()=>openModal("Add Customer",`<form id="customerForm" class="form-grid"><label>Name<input name="name" required></label><label>Phone<input name="phone"></label><label>Email<input name="email" type="email"></label><label class="wide">Address<textarea name="address"></textarea></label><button class="primary-btn" type="submit">Add Customer</button></form>`);
  $("addExpenseBtn").onclick=()=>openModal("Add Expense",`<form id="expenseForm" class="form-grid"><label>Category<select name="category"><option>Rent</option><option>Utilities</option><option>Transport</option><option>Salary</option><option>Stock</option><option>Other</option></select></label><label>Amount<input name="amount" type="number" min="0" step=".01" required></label><label class="wide">Note<textarea name="note"></textarea></label><button class="primary-btn" type="submit">Save Expense</button></form>`);
  $("ticketForm").onsubmit=async e=>{e.preventDefault();const data={user_id:state.user.id,subject:$("ticketSubject").value.trim(),category:$("ticketCategory").value,message:$("ticketMessage").value.trim()};const {error}=await dbClient.from("support_tickets").insert(data);if(error)return toast(error.message,true);e.currentTarget.reset();await loadTickets();renderTickets();toast("Support ticket submitted");};
  $("settingsForm").onsubmit=async e=>{e.preventDefault();const data={full_name:$("settingsName").value.trim(),business_name:$("settingsBusiness").value.trim(),phone:$("settingsPhone").value.trim(),address:$("settingsAddress").value.trim(),currency:$("settingsCurrency").value};const {error}=await dbClient.from("profiles").upsert({id:state.user.id,...data});if(error)return toast(error.message,true);await loadProfile();renderAll();toast("Settings saved");};
  $("completeSale").onclick=completeSale;
  $("runReport").onclick=runReport;$("printReport").onclick=()=>window.print();
  document.querySelectorAll("[data-range]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-range]").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderChart(b.dataset.range)});
  $("closeModal").onclick=closeModal;$("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
  $("customersTable").addEventListener("click",customerTableHandler);
  $("productsTable").addEventListener("click",productTableHandler);
  $("posProducts").addEventListener("click",e=>{const b=e.target.closest("[data-product]");if(!b)return;const p=state.products.find(x=>x.id===b.dataset.product);if(!p||p.stock<=0)return toast("Product is out of stock.",true);const item=state.cart.find(x=>x.id===p.id);if(item){if(item.quantity>=p.stock)return toast("Not enough stock.",true);item.quantity++}else state.cart.push({id:p.id,name:p.name,price:Number(p.selling_price),cost:Number(p.cost_price),quantity:1});renderCart()});
  $("cart").addEventListener("click",e=>{const plus=e.target.closest("[data-cart-plus]"),minus=e.target.closest("[data-cart-minus]");if(plus){const i=state.cart.find(x=>x.id===plus.dataset.cartPlus),p=state.products.find(x=>x.id===i.id);if(i.quantity<p.stock)i.quantity++;}if(minus){const i=state.cart.find(x=>x.id===minus.dataset.cartMinus);i.quantity--;if(i.quantity<=0)state.cart=state.cart.filter(x=>x.id!==i.id)}renderCart()});
  $("customersTable").addEventListener("click",()=>{});
  $("addCustomerBtn").addEventListener("click",()=>{setTimeout(()=>{const f=$("customerForm");if(f)f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));d.user_id=state.user.id;const {error}=await dbClient.from("customers").insert(d);if(error)return toast(error.message,true);closeModal();await loadCustomers();renderAll();toast("Customer added")}},0)});
  $("addExpenseBtn").addEventListener("click",()=>{setTimeout(()=>{const f=$("expenseForm");if(f)f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));d.amount=Number(d.amount);d.user_id=state.user.id;const {error}=await dbClient.from("expenses").insert(d);if(error)return toast(error.message,true);closeModal();await loadExpenses();renderAll();toast("Expense saved")}},0)});
}
function productTableHandler(e){const edit=e.target.closest(".edit-product"),del=e.target.closest(".delete-product");if(edit){const p=state.products.find(x=>x.id===edit.dataset.id);openModal("Edit Product",productForm(p));$("productForm").onsubmit=x=>{x.preventDefault();saveProduct(x.currentTarget,p.id)}}if(del)deleteProduct(del.dataset.id)}
function customerTableHandler(){}

async function completeSale(){
 if(!state.cart.length)return toast("Add at least one product.",true);
 const subtotal=state.cart.reduce((a,i)=>a+i.price*i.quantity,0),discount=Number($("saleDiscount").value||0),total=Math.max(0,subtotal-discount);
 const profit=state.cart.reduce((a,i)=>a+(i.price-i.cost)*i.quantity,0)-discount;
 const invoice=`BP-${Date.now().toString().slice(-8)}`;
 const {data:sale,error}=await dbClient.from("sales").insert({user_id:state.user.id,customer_id:$("saleCustomer").value||null,invoice_no:invoice,subtotal,discount,total,profit,payment_method:$("paymentMethod").value}).select().single();
 if(error)return toast(error.message,true);
 const items=state.cart.map(i=>({sale_id:sale.id,user_id:state.user.id,product_id:i.id,product_name:i.name,quantity:i.quantity,unit_price:i.price,cost_price:i.cost,total:i.price*i.quantity}));
 const {error:itemError}=await dbClient.from("sale_items").insert(items);
 if(itemError)return toast(itemError.message,true);
 for(const i of state.cart){const p=state.products.find(x=>x.id===i.id);await dbClient.from("products").update({stock:Number(p.stock)-i.quantity}).eq("id",i.id)}
 state.cart=[];$("saleDiscount").value=0;await Promise.all([loadProducts(),loadSales()]);renderAll();toast(`Sale ${invoice} completed`);
}
function runReport(){
 const from=new Date($("reportFrom").value||"2000-01-01");from.setHours(0,0,0,0);const to=new Date($("reportTo").value||"2999-12-31");to.setHours(23,59,59,999);
 const sales=state.sales.filter(s=>{const d=new Date(s.created_at);return d>=from&&d<=to}),expenses=state.expenses.filter(e=>{const d=new Date(e.created_at);return d>=from&&d<=to});
 $("reportSales").textContent=money(sales.reduce((a,s)=>a+Number(s.total),0));$("reportProfit").textContent=money(sales.reduce((a,s)=>a+Number(s.profit||0),0));$("reportExpenses").textContent=money(expenses.reduce((a,e)=>a+Number(e.amount),0));$("reportOrders").textContent=sales.length;
 $("reportDetails").innerHTML=sales.length?`<div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Profit</th></tr></thead><tbody>${sales.map(s=>`<tr><td>${esc(s.invoice_no)}</td><td>${new Date(s.created_at).toLocaleString()}</td><td>${money(s.total)}</td><td>${money(s.profit)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No sales in this period.</div>`;
}
dbClient.auth.onAuthStateChange((_event,session)=>{if(!session&&location.pathname.endsWith("app.html"))location.href="index.html"});
init();