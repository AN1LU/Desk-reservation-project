
#this code is able to generate a QR based on the desk reservation details
import random
import string
import qrcode



def code_generator(length=8, use_uppercase=True, use_numbers=True, use_special_chars=False):
    #if length is less than 1, raise an error
    if length < 1:
        raise ValueError("Password length must be at least 1")
    #create a pool of characters based on user preferences
    characters = string.ascii_lowercase
    #add uppercase letters, numbers, and special characters based on user input if user wants them
    if use_uppercase:
        characters += string.ascii_uppercase
    #add numbers and special characters based on user input only if user wants them
    if use_numbers:
        characters += string.digits
    #add special characters based on user input only if user wants them
    if use_special_chars:
        characters += string.punctuation

    #generate a random password from the character pool
    password = ''.join(random.choice(characters) for _ in range(length))
    return password

def generate_qr_code(data, filename='qr_code.png'):
    img = qrcode.make(data)
    save_path = f'./{filename}'
    img.save(save_path)
    print(f"QR code generated and saved as {save_path}")
 

if __name__ == "__main__":
    try:
        #get user input for password generation parameters
        length = 8
        use_uppercase = True
        use_numbers = True
        use_special_chars = False
        #generate password based on user input
        encode = code_generator(length, use_uppercase, use_numbers, use_special_chars)
        print(f"Generated code to enconde: {encode}")

        data = encode
        if not data:
            raise ValueError("Data cannot be empty.")
        filename = 'qr_code.png'
        generate_qr_code(data, filename)
    except Exception as e:
        print(f"An error occurred: {e}")
    except ValueError as e:
        print(f"An error occurred: {e}")