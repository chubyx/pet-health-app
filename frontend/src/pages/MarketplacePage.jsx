import { useEffect, useMemo, useState } from "react";
import "../styles/Marketplace.css";

const CART_STORAGE_KEY = "pet-health-marketplace-cart";

const products = [
  { id: "food-dog", name: "Alimento premium para perro", category: "Alimentos", price: 18990, detail: "Pollo y arroz · 3 kg", emoji: "🥣", badge: "Más vendido" },
  { id: "food-cat", name: "Alimento para gato adulto", category: "Alimentos", price: 15990, detail: "Salmón · 2 kg", emoji: "🐟", badge: "Nutrición" },
  { id: "treats", name: "Galletas de entrenamiento", category: "Alimentos", price: 4990, detail: "Premios horneados · 300 g", emoji: "🦴" },
  { id: "toy-ball", name: "Pelota resistente", category: "Juguetes", price: 6990, detail: "Para jugar dentro y fuera", emoji: "🎾" },
  { id: "toy-cat", name: "Varita con plumas", category: "Juguetes", price: 3990, detail: "Diversión para gatos curiosos", emoji: "🪶" },
  { id: "shampoo", name: "Shampoo suave para mascotas", category: "Higiene", price: 7990, detail: "Avena · apto para piel sensible", emoji: "🧴" },
  { id: "brush", name: "Cepillo desenredante", category: "Higiene", price: 8990, detail: "Cuidado diario del pelaje", emoji: "🪮" },
  { id: "collar", name: "Collar ajustable", category: "Accesorios", price: 5990, detail: "Cómodo y fácil de ajustar", emoji: "🐾" },
];

const categories = ["Todos", "Alimentos", "Juguetes", "Higiene", "Accesorios"];
const formatPrice = (price) => price.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function readCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(savedCart)) return [];
    return savedCart.filter((item) =>
      products.some((product) => product.id === item.id) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    );
  } catch (error) {
    console.error("No se pudo leer el carrito guardado:", error);
    return [];
  }
}

export default function MarketplacePage() {
  const [cart, setCart] = useState(readCart);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error("No se pudo guardar el carrito:", error);
      setNotice("No fue posible guardar el carrito en este navegador.");
    }
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return products.filter((product) =>
      (category === "Todos" || product.category === category) &&
      (!query || `${product.name} ${product.detail} ${product.category}`.toLocaleLowerCase("es").includes(query))
    );
  }, [category, search]);

  const cartItems = cart
    .map((item) => ({ ...item, product: products.find((product) => product.id === item.id) }))
    .filter((item) => item.product);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);

  function addToCart(product) {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);
      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { id: product.id, quantity: 1 }];
    });
    setNotice(`${product.name} se agregó al carrito.`);
  }

  function changeQuantity(productId, amount) {
    setCart((currentCart) => currentCart
      .map((item) => item.id === productId ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  }

  return (
    <div className="marketplace-page fade-in">
      <section className="marketplace-hero">
        <div>
          <span className="marketplace-eyebrow">TODO PARA SU BIENESTAR</span>
          <h1>La tienda de tus mascotas</h1>
          <p>Encuentra alimentos, juguetes y esenciales para acompañarlos todos los días.</p>
        </div>
        <div className="marketplace-hero-art" aria-hidden="true">🐶🐱</div>
      </section>

      <div className="marketplace-layout">
        <section className="marketplace-catalog" aria-label="Catálogo de productos">
          <div className="marketplace-toolbar">
            <label className="marketplace-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar alimentos, juguetes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar productos"
              />
            </label>
            <span className="marketplace-result-count">{filteredProducts.length} productos</span>
          </div>

          <div className="marketplace-categories" aria-label="Filtrar por categoría">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`marketplace-category${category === item ? " selected" : ""}`}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>

          {notice && <p className="marketplace-notice" role="status">{notice}</p>}

          {filteredProducts.length > 0 ? (
            <div className="marketplace-products">
              {filteredProducts.map((product) => (
                <article className="marketplace-product-card" key={product.id}>
                  <div className={`product-illustration product-${product.category.toLowerCase()}`}>
                    {product.badge && <span className="product-badge">{product.badge}</span>}
                    <span aria-hidden="true">{product.emoji}</span>
                  </div>
                  <div className="product-card-content">
                    <span className="product-category-label">{product.category}</span>
                    <h2>{product.name}</h2>
                    <p>{product.detail}</p>
                    <div className="product-card-footer">
                      <strong>{formatPrice(product.price)}</strong>
                      <button type="button" className="product-add-button" onClick={() => addToCart(product)}>
                        Agregar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="marketplace-empty">
              <span aria-hidden="true">🔎</span>
              <h2>No encontramos productos</h2>
              <p>Prueba con otra búsqueda o selecciona una categoría diferente.</p>
            </div>
          )}
        </section>

        <aside className="marketplace-cart" aria-label="Carrito de compras">
          <div className="cart-heading">
            <div>
              <h2>Tu carrito</h2>
              <p>{cartCount} {cartCount === 1 ? "producto" : "productos"}</p>
            </div>
            <span className="cart-icon" aria-hidden="true">🛒</span>
          </div>

          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <span aria-hidden="true">🧺</span>
              <p>Tu carrito está vacío</p>
              <small>Agrega productos para verlos aquí.</small>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map(({ id, quantity, product }) => (
                  <div className="cart-item" key={id}>
                    <span className="cart-item-emoji" aria-hidden="true">{product.emoji}</span>
                    <div className="cart-item-details">
                      <strong>{product.name}</strong>
                      <span>{formatPrice(product.price)}</span>
                      <div className="cart-quantity">
                        <button type="button" onClick={() => changeQuantity(id, -1)} aria-label={`Quitar una unidad de ${product.name}`}>−</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => changeQuantity(id, 1)} aria-label={`Agregar una unidad de ${product.name}`}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>Subtotal</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
            </>
          )}

          <button type="button" className="cart-checkout-button" disabled>
            Finalizar compra
          </button>
          <p className="cart-demo-note">Catálogo de demostración. Las compras y los pagos aún no están habilitados.</p>
        </aside>
      </div>
    </div>
  );
}
