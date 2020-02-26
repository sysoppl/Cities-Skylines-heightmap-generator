# C++ embedded code generator
Based on svd files.

### Generate a embedded C++ header out of a device svd file

### Prerequisites
python 3
git

### setting up the parser
```sh
$ git clone  https://github.com/posborne/cmsis-svd.git tmp
mkdir cmsis_svd
cp tmp/python/cmsis_svd/*.py cmsis_svd 
mkdir cmsis_svd/data
# change vendor to your conviniance
cp -r tmp/data/STMicro cmsis_svd/data
rm -fR tmp
```   


### running the conversion
```sh
$ python stm32conv.py STM32F030.svd -o proefje.hpp
```

### final notes
On many svd file, the arm core (Systick, NVIC) is missing. These missing files can be found at:  
https://github.com/ARM-software/CMSIS/tree/master/Device/ARM/SVD  
The converter checks if a systick is present, if not it adds the ARM core file.