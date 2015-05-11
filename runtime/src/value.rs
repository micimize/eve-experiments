use std::cmp::Ordering;
use std::ops::Index;

#[derive(Clone, Debug, PartialOrd, PartialEq)]
pub enum Value {
    Bool(bool),
    String(String),
    Float(f64),
}

pub type Id = String; // TODO use uuid?

impl Ord for Value {
    fn cmp(&self, other: &Value) -> Ordering {
        self.partial_cmp(other).unwrap() // TODO this will panic on NaN
    }
}

impl Eq for Value {} // TODO this is unsafe for NaN

impl Value {
    pub fn as_str(&self) -> &str {
        match *self {
            Value::String(ref string) => &*string,
            _ => panic!("Cannot convert this to string: {:?}", self),
        }
    }

    pub fn to_f64(&self) -> Option<f64> {
        match *self {
            Value::Float(float) => Some(float),
            _ => None,
        }
    }

    pub fn to_i64(&self) -> Option<i64> {
        match *self {
            Value::Float(float) => {
                let result = float as i64;
                if float == (result as f64) {
                    Some(result)
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    pub fn to_usize(&self) -> Option<usize> {
        match *self {
            Value::Float(float) => {
                let result = float as usize;
                if float == (result as f64) {
                    Some(result)
                } else {
                    None
                }
            },
            _ => None,
        }
    }
}

pub type Field = Id;

pub struct Tuple<'a> {
    pub fields: &'a [Field],
    pub values: &'a [Value],
}

impl<'a, 'b> Index<&'b str> for Tuple<'a> {
    type Output = Value;
    fn index<'c>(&'c self, index: &'b str) -> &'c Value {
        let ix = self.fields.iter().position(|field| &field[..] == index).unwrap();
        &self.values[ix]
    }
}

