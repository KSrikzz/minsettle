export const paiseToRupees = (paise) => {
  if (typeof paise !== 'number' || isNaN(paise)) return '0.00'
  return (paise / 100).toFixed(2)
}

export const formatINR = (paise) => {
  const rupees = paiseToRupees(paise)
  const parts = rupees.split('.')
  let intPart = parts[0]
  const decPart = parts[1]
  const isNegative = intPart.startsWith('-')
  if (isNegative) {
    intPart = intPart.slice(1)
  }
  let lastThree = intPart.slice(-3)
  const otherNumbers = intPart.slice(0, -3)
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree
  return `${isNegative ? '-' : ''}₹${formattedInt}.${decPart}`
}

export const rupeesToPaise = (rupees) => {
  const num = parseFloat(rupees)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}
